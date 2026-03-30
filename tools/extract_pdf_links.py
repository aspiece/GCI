import re
import sys
from pathlib import Path

pdf_path = Path(r"c:\Users\aspie\Downloads\Intro 3D Printing Lab.pdf")
if not pdf_path.exists():
    print(f"MISSING_FILE {pdf_path}")
    sys.exit(1)

text = ""
last_error = None

for module_name in ("pypdf", "PyPDF2"):
    try:
        if module_name == "pypdf":
            import pypdf as pdfmod
        else:
            import PyPDF2 as pdfmod
        reader = pdfmod.PdfReader(str(pdf_path))
        text = "\n".join((page.extract_text() or "") for page in reader.pages)
        break
    except Exception as exc:
        last_error = exc

if not text:
    print(f"EXTRACT_ERROR {last_error}")
    sys.exit(1)

url_tokens = re.findall(r"https?://\S+", text)
clean_urls = sorted({token.rstrip(").,]") for token in url_tokens})

print(f"URL_COUNT {len(clean_urls)}")
for url in clean_urls:
    print(url)

print("\n---TEXT_START---")
print(text[:20000])
print("---TEXT_END---")
