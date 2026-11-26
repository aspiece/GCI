// Run with: node --test group-generator/tests/office-exports.test.cjs
// Validates generated OpenXML containers without sending classroom names to a service.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const JSZip=require('../vendor/jszip.min.js');
const script=fs.readFileSync(path.join(__dirname,'..','export-formats.js'),'utf8');
const browser={JSZip};
new Function('window',script)(browser);
const groups=[
 ['Alex & Jordan','<Taylor>','Sam'],
 ['Robin "B"','Morgan', 'Avery']
];
async function openOffice(format){
 const blob=await browser.GroupExport.make(format,groups);
 assert.ok(blob.size>500,'Office download is nonempty');
 const zip=await JSZip.loadAsync(Buffer.from(await blob.arrayBuffer()));
 return zip;
}
test('Word and Google Docs compatible DOCX includes exact student names',async()=>{
 const zip=await openOffice('docx');
 const content=await zip.file('word/document.xml').async('string');
 assert.match(content,/Classroom Group Assignments/);
 assert.match(content,/Group 1 \(3 students\)/);
 assert.match(content,/Alex &amp; Jordan/);
 assert.match(content,/&lt;Taylor&gt;/);
 assert.ok(zip.file('[Content_Types].xml'));
 assert.ok(zip.file('_rels/.rels'));
});
test('Excel and Google Sheets compatible XLSX preserves group/student rows',async()=>{
 const zip=await openOffice('xlsx');
 const workbook=await zip.file('xl/workbook.xml').async('string');
 const worksheet=await zip.file('xl/worksheets/sheet1.xml').async('string');
 assert.match(workbook,/Group Assignments/);
 assert.match(worksheet,/Group 1/);
 assert.match(worksheet,/Group 2/);
 assert.match(worksheet,/Alex &amp; Jordan/);
 assert.match(worksheet,/&lt;Taylor&gt;/);
 assert.equal((worksheet.match(/<row r="/g)||[]).length,7);
 assert.ok(zip.file('xl/_rels/workbook.xml.rels'));
});
test('PowerPoint and Google Slides compatible PPTX has one slide per group',async()=>{
 const zip=await openOffice('pptx');
 const presentation=await zip.file('ppt/presentation.xml').async('string');
 const first=await zip.file('ppt/slides/slide1.xml').async('string');
 const second=await zip.file('ppt/slides/slide2.xml').async('string');
 assert.match(presentation,/<p:sldId id="256"/);
 assert.match(presentation,/<p:sldId id="257"/);
 assert.match(first,/Alex &amp; Jordan/);
 assert.match(first,/Group 1/);
 assert.match(second,/Robin &quot;B&quot;/);
 assert.ok(zip.file('ppt/slideMasters/slideMaster1.xml'));
 assert.ok(zip.file('ppt/slideLayouts/slideLayout1.xml'));
 assert.ok(zip.file('ppt/theme/theme1.xml'));
});
test('Large groups are split into multiple readable slides',async()=>{
 const many=Array.from({length:25},(_,i)=>'Student '+(i+1));
 const blob=await browser.GroupExport.make('pptx',[many]);
 const zip=await JSZip.loadAsync(Buffer.from(await blob.arrayBuffer()));
 assert.ok(zip.file('ppt/slides/slide2.xml'));
 const s1=await zip.file('ppt/slides/slide1.xml').async('string');
 const s2=await zip.file('ppt/slides/slide2.xml').async('string');
 assert.match(s1,/Student 16/);
 assert.doesNotMatch(s1,/Student 17/);
 assert.match(s2,/Student 17/);
 assert.match(s2,/Student 25/);
});
test('Unsupported format or empty groups cannot create an Office file',async()=>{
 await assert.rejects(browser.GroupExport.make('pdf',groups),/Unsupported/);
 await assert.rejects(browser.GroupExport.make('docx',[]),/Generate or load/);
});
