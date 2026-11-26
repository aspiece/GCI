/* Office export helpers for Classroom Group Generator.
   Runs locally in the browser with vendored JSZip (MIT).
   Downloads Office files compatible with Word/Docs, Excel/Sheets, and PowerPoint/Slides.
   Does not create native Google documents or transmit names to a server. */
(function(root){
'use strict';
var NS_REL='http://schemas.openxmlformats.org/package/2006/relationships';
var NS_CT='http://schemas.openxmlformats.org/package/2006/content-types';
var NS_OFFICE_REL='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
var NS_P='http://schemas.openxmlformats.org/presentationml/2006/main';
var NS_A='http://schemas.openxmlformats.org/drawingml/2006/main';
function esc(value){return String(value==null?'':value).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');}
function header(){return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';}
function rels(items){return header()+'<Relationships xmlns="'+NS_REL+'">'+items.map(function(item){return '<Relationship Id="'+item[0]+'" Type="'+item[1]+'" Target="'+item[2]+'"/>';}).join('')+'</Relationships>';}
function types(defaults,overrides){return header()+'<Types xmlns="'+NS_CT+'">'+defaults.map(function(v){return '<Default Extension="'+v[0]+'" ContentType="'+v[1]+'"/>';}).join('')+overrides.map(function(v){return '<Override PartName="'+v[0]+'" ContentType="'+v[1]+'"/>';}).join('')+'</Types>';}
function standardTypes(overrides){return types([['rels','application/vnd.openxmlformats-package.relationships+xml'],['xml','application/xml']],overrides);}
function packageZip(files,mime){
 if(!root.JSZip) return Promise.reject(new Error('File export library is unavailable. Try refreshing the page.'));
 var zip=new root.JSZip();
 Object.keys(files).forEach(function(path){zip.file(path,files[path]);});
 return zip.generateAsync({type:'uint8array',compression:'DEFLATE',compressionOptions:{level:6}}).then(function(bytes){return new Blob([bytes],{type:mime});});
}
function wordParagraph(value,options){
 var bold=options&&options.bold,large=options&&options.large;
 var style=(bold||large)?'<w:rPr>'+(bold?'<w:b/>':'')+(large?'<w:sz w:val="'+large+'"/>':'')+'</w:rPr>':'';
 return '<w:p><w:pPr><w:spacing w:after="'+(large?150:85)+'"/></w:pPr><w:r>'+style+'<w:t xml:space="preserve">'+esc(value)+'</w:t></w:r></w:p>';
}
function docx(groups){
 var contents=wordParagraph('Classroom Group Assignments',{bold:true,large:34});
 groups.forEach(function(group,index){
  contents+=wordParagraph('Group '+(index+1)+' ('+group.length+' '+(group.length===1?'student':'students')+')',{bold:true,large:25});
  group.forEach(function(person){contents+=wordParagraph(person);});
 });
 var documentXML=header()+'<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'+contents+'<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1000" w:right="1040" w:bottom="1000" w:left="1040" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>';
 var files={
  '[Content_Types].xml':standardTypes([['/word/document.xml','application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml']]),
  '_rels/.rels':rels([['rId1',NS_OFFICE_REL+'/officeDocument','word/document.xml']]),
  'word/document.xml':documentXML
 };
 return packageZip(files,'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
}
function excelString(address,value){return '<c r="'+address+'" t="inlineStr"><is><t xml:space="preserve">'+esc(value)+'</t></is></c>';}
function excelNumber(address,n){return '<c r="'+address+'"><v>'+n+'</v></c>';}
function xlsx(groups){
 var rows=['<row r="1">'+excelString('A1','Group')+excelString('B1','Student')+excelString('C1','Student #')+'</row>'];
 var row=2;
 groups.forEach(function(group,i){
  group.forEach(function(name,studentIndex){rows.push('<row r="'+row+'">'+excelString('A'+row,'Group '+(i+1))+excelString('B'+row,name)+excelNumber('C'+row,studentIndex+1)+'</row>');row++;});
 });
 var sheet=header()+'<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"/></sheetViews><sheetFormatPr defaultRowHeight="16"/><cols><col min="1" max="1" width="19" customWidth="1"/><col min="2" max="2" width="34" customWidth="1"/><col min="3" max="3" width="15" customWidth="1"/></cols><sheetData>'+rows.join('')+'</sheetData><autoFilter ref="A1:C'+(row-1)+'"/></worksheet>';
 var workbook=header()+'<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="'+NS_OFFICE_REL+'"><sheets><sheet name="Group Assignments" sheetId="1" r:id="rId1"/></sheets></workbook>';
 var files={
  '[Content_Types].xml':standardTypes([['/xl/workbook.xml','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml'],['/xl/worksheets/sheet1.xml','application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml']]),
  '_rels/.rels':rels([['rId1',NS_OFFICE_REL+'/officeDocument','xl/workbook.xml']]),
  'xl/workbook.xml':workbook,
  'xl/_rels/workbook.xml.rels':rels([['rId1',NS_OFFICE_REL+'/worksheet','worksheets/sheet1.xml']]),
  'xl/worksheets/sheet1.xml':sheet
 };
 return packageZip(files,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}
function groupTree(){return '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>';}
function shape(id,text,x,y,w,h,size,bold,color){
 return '<p:sp><p:nvSpPr><p:cNvPr id="'+id+'" name="Text '+id+'"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>'
  +'<p:spPr><a:xfrm><a:off x="'+x+'" y="'+y+'"/><a:ext cx="'+w+'" cy="'+h+'"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></p:spPr>'
  +'<p:txBody><a:bodyPr wrap="square" lIns="0" tIns="0" rIns="0" bIns="0"/><a:lstStyle/><a:p><a:pPr algn="l"/><a:r><a:rPr lang="en-US" sz="'+size+'"'+(bold?' b="1"':'')+'><a:solidFill><a:srgbClr val="'+color+'"/></a:solidFill><a:latin typeface="'+(bold?'Georgia':'Arial')+'"/></a:rPr><a:t>'+esc(text)+'</a:t></a:r><a:endParaRPr lang="en-US"/></a:p></p:txBody></p:sp>';
}
function slideXML(group,index,part,total){
 var partLabel=total>1?' — part '+part+' of '+total:'';
 var start=(part-1)*16,names=group.slice(start,start+16),shapes='';
 shapes+=shape(2,'Group '+(index+1)+partLabel,650000,500000,10900000,810000,3100,true,'193341');
 shapes+=shape(3,group.length+' '+(group.length===1?'student':'students')+'  |  Genesee Learning Lab',650000,1400000,10700000,460000,1400,false,'68747A');
 names.forEach(function(name,i){var col=i>=8?1:0,row=i%8;shapes+=shape(i+4,name,700000+col*5600000,2170000+row*510000,5050000,440000,1900,false,'24343D');});
 return header()+'<p:sld xmlns:a="'+NS_A+'" xmlns:r="'+NS_OFFICE_REL+'" xmlns:p="'+NS_P+'"><p:cSld name="Group '+(index+1)+'"><p:bg><p:bgPr><a:solidFill><a:srgbClr val="FFFDF9"/></a:solidFill><a:effectLst/></p:bgPr></p:bg><p:spTree>'+groupTree()+shapes+'</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>';
}
function theme(){
 var colors=[['dk1','24343D'],['lt1','FFFDF9'],['dk2','193341'],['lt2','F6F4EF'],['accent1','274C61'],['accent2','A87747'],['accent3','68817B'],['accent4','647589'],['accent5','9A735C'],['accent6','5B7E83'],['hlink','274C61'],['folHlink','85572F']];
 var scheme=colors.map(function(c){return '<a:'+c[0]+'><a:srgbClr val="'+c[1]+'"/></a:'+c[0]+'>';}).join('');
 var fill='<a:solidFill><a:schemeClr val="accent1"/></a:solidFill>';
 var line='<a:ln w="6350"><a:solidFill><a:schemeClr val="tx1"/></a:solidFill></a:ln>';
 var effect='<a:effectStyle><a:effectLst/></a:effectStyle>';
 return header()+'<a:theme xmlns:a="'+NS_A+'" name="Genesee Learning Lab"><a:themeElements><a:clrScheme name="Genesee Learning Lab">'+scheme+'</a:clrScheme><a:fontScheme name="GCI"><a:majorFont><a:latin typeface="Georgia"/></a:majorFont><a:minorFont><a:latin typeface="Arial"/></a:minorFont></a:fontScheme><a:fmtScheme name="GCI"><a:fillStyleLst>'+fill.repeat(3)+'</a:fillStyleLst><a:lnStyleLst>'+line.repeat(3)+'</a:lnStyleLst><a:effectStyleLst>'+effect.repeat(3)+'</a:effectStyleLst><a:bgFillStyleLst>'+fill.repeat(3)+'</a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>';
}
function pptx(groups){
 var slides=[],files={},i;
 groups.forEach(function(group,index){var total=Math.max(1,Math.ceil(group.length/16));for(var p=1;p<=total;p++)slides.push({group:group,index:index,part:p,total:total});});
 if(slides.length>300)return Promise.reject(new Error('Too many presentation slides. Choose Word or Excel for this large roster.'));
 var slideIdList='',presentationRels=[['rId1',NS_OFFICE_REL+'/slideMaster','slideMasters/slideMaster1.xml']],overrides=[
  ['/ppt/presentation.xml','application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml'],
  ['/ppt/slideMasters/slideMaster1.xml','application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml'],
  ['/ppt/slideLayouts/slideLayout1.xml','application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml'],
  ['/ppt/theme/theme1.xml','application/vnd.openxmlformats-officedocument.theme+xml']
 ];
 slides.forEach(function(slide,i){
  var num=i+1,rel='rId'+(num+1);
  slideIdList+='<p:sldId id="'+(255+num)+'" r:id="'+rel+'"/>';
  presentationRels.push([rel,NS_OFFICE_REL+'/slide','slides/slide'+num+'.xml']);
  overrides.push(['/ppt/slides/slide'+num+'.xml','application/vnd.openxmlformats-officedocument.presentationml.slide+xml']);
  files['ppt/slides/slide'+num+'.xml']=slideXML(slide.group,slide.index,slide.part,slide.total);
  files['ppt/slides/_rels/slide'+num+'.xml.rels']=rels([['rId1',NS_OFFICE_REL+'/slideLayout','../slideLayouts/slideLayout1.xml']]);
 });
 var layout='<p:sldLayout xmlns:a="'+NS_A+'" xmlns:r="'+NS_OFFICE_REL+'" xmlns:p="'+NS_P+'" type="blank" preserve="1"><p:cSld name="Blank"><p:spTree>'+groupTree()+'</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>';
 var master='<p:sldMaster xmlns:a="'+NS_A+'" xmlns:r="'+NS_OFFICE_REL+'" xmlns:p="'+NS_P+'"><p:cSld name="GCI Master"><p:spTree>'+groupTree()+'</p:spTree></p:cSld><p:clrMap accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink" bg1="lt1" bg2="lt2" tx1="dk1" tx2="dk2"/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst><p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles></p:sldMaster>';
 files['[Content_Types].xml']=standardTypes(overrides);
 files['_rels/.rels']=rels([['rId1',NS_OFFICE_REL+'/officeDocument','ppt/presentation.xml']]);
 files['ppt/presentation.xml']=header()+'<p:presentation xmlns:a="'+NS_A+'" xmlns:r="'+NS_OFFICE_REL+'" xmlns:p="'+NS_P+'"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>'+slideIdList+'</p:sldIdLst><p:sldSz cx="12192000" cy="6858000" type="screen16x9"/><p:notesSz cx="6858000" cy="9144000"/><p:defaultTextStyle/></p:presentation>';
 files['ppt/_rels/presentation.xml.rels']=rels(presentationRels);
 files['ppt/slideLayouts/slideLayout1.xml']=header()+layout;
 files['ppt/slideLayouts/_rels/slideLayout1.xml.rels']=rels([['rId1',NS_OFFICE_REL+'/slideMaster','../slideMasters/slideMaster1.xml']]);
 files['ppt/slideMasters/slideMaster1.xml']=header()+master;
 files['ppt/slideMasters/_rels/slideMaster1.xml.rels']=rels([['rId1',NS_OFFICE_REL+'/slideLayout','../slideLayouts/slideLayout1.xml'],['rId2',NS_OFFICE_REL+'/theme','../theme/theme1.xml']]);
 files['ppt/theme/theme1.xml']=theme();
 return packageZip(files,'application/vnd.openxmlformats-officedocument.presentationml.presentation');
}
function pdf(groups){
 var PDF=root.jspdf&&root.jspdf.jsPDF;
 if(!PDF)return Promise.reject(new Error('PDF export library is unavailable. Reload the page and try again.'));
 var doc=new PDF({orientation:'portrait',unit:'pt',format:'letter',compress:true});
 var pageWidth=612,pageHeight=792,margin=46,right=pageWidth-margin,bottom=pageHeight-52;
 var cursor=0,page=0;
 function headerPage(){
  page++;
  if(page>1)doc.addPage();
  doc.setFillColor(25,51,65);
  doc.rect(0,0,pageWidth,73,'F');
  doc.setFont('times','bold');doc.setFontSize(20);doc.setTextColor(255,253,249);
  doc.text('Classroom Group Assignments',margin,45);
  doc.setDrawColor(168,119,71);doc.setLineWidth(3);doc.line(0,73,pageWidth,73);
  doc.setTextColor(36,52,61);cursor=103;
 }
 function checkRoom(h){if(cursor+h>bottom)headerPage();}
 function text(value,x,y){doc.text(String(value),x,y);}
 function wrap(value,width){
  return doc.splitTextToSize(String(value),width);
 }
 headerPage();
 groups.forEach(function(group,index){
  checkRoom(60);
  doc.setFillColor(238,234,226);
  doc.roundedRect(margin,cursor-16,right-margin,31,1.5,1.5,'F');
  doc.setFont('times','bold');doc.setFontSize(15);doc.setTextColor(25,51,65);
  text('Group '+(index+1),margin+10,cursor+4);
  doc.setFont('helvetica','normal');doc.setFontSize(10);doc.setTextColor(83,97,107);
  text(group.length+' '+(group.length===1?'student':'students'),right-83,cursor+3);
  cursor+=29;
  group.forEach(function(name){
   doc.setFont('helvetica','normal');doc.setFontSize(11);doc.setTextColor(36,52,61);
   var nameLines=wrap(name,right-margin-38);
   for(var j=0;j<nameLines.length;j++){
    checkRoom(19);
    text((j===0?'•  ':'   ')+nameLines[j],margin+14,cursor+4);
    cursor+=17;
   }
  });
  cursor+=19;
 });
 var count=doc.getNumberOfPages();
 for(var p=1;p<=count;p++){
  doc.setPage(p);doc.setDrawColor(212,208,199);doc.line(margin,pageHeight-43,right,pageHeight-43);
  doc.setTextColor(83,97,107);doc.setFont('helvetica','normal');doc.setFontSize(9);
  doc.text('Genesee Learning Lab  |  Classroom Group Generator',margin,pageHeight-28);
  doc.text('Page '+p+' of '+count,right,pageHeight-28,{align:'right'});
 }
 return Promise.resolve(doc.output('blob'));
}

function make(format,groups){
 if(!Array.isArray(groups)||!groups.length||groups.some(function(g){return !Array.isArray(g)||!g.length||g.some(function(n){return typeof n!=='string';});}))return Promise.reject(new Error('Generate or load a grouping before downloading.'));
 if(format==='docx')return docx(groups);
 if(format==='xlsx')return xlsx(groups);
 if(format==='pptx')return pptx(groups);
 if(format==='pdf')return pdf(groups);
 return Promise.reject(new Error('Unsupported document format.'));
}
root.GroupExport={make:make};
})(window);
