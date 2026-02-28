from pathlib import Path

resume_out_path = Path(
    r"c:\github\GCI\wordprojectfiles\Lastname_Firstname_CareerPacket_Template.docx"
)
cover_letter_out_path = Path(
    r"c:\github\GCI\wordprojectfiles\Lastname_Firstname_CareerPacket_CoverLetter_Template.docx"
)

try:
    from docx import Document
except ImportError:
    import subprocess
    import sys

    subprocess.check_call([sys.executable, "-m", "pip", "install", "python-docx"])
    from docx import Document


doc = Document()

doc.add_heading("Career Essentials Resume Template", level=0)

doc.add_paragraph("Name: ________________________________")
doc.add_paragraph("City, State: __________________________")
doc.add_paragraph("Phone: _______________________________")
doc.add_paragraph("Email: _______________________________")
doc.add_paragraph("")

doc.add_heading("Professional Summary", level=1)
doc.add_paragraph(
    "Write 2–3 sentences that highlight your strengths and goals for this role."
)

doc.add_heading("Skills", level=1)
doc.add_paragraph("• Skill 1\n• Skill 2\n• Skill 3\n• Skill 4")

doc.add_heading("Education", level=1)
doc.add_paragraph("School Name, City, State")
doc.add_paragraph("Expected Graduation: ________")
doc.add_paragraph("Relevant Coursework or Honors: ________________________________")

doc.add_heading("Experience", level=1)
doc.add_paragraph("Role/Project/Activity Name — Dates")
doc.add_paragraph("• Action + result bullet 1")
doc.add_paragraph("• Action + result bullet 2")

doc.save(resume_out_path)
print(f"Created: {resume_out_path}")

cover = Document()
cover.add_heading("Career Essentials Cover Letter Template", level=0)
cover.add_paragraph("Date: ________________________________")
cover.add_paragraph("Hiring Manager")
cover.add_paragraph("Company Name")
cover.add_paragraph("Company Address")
cover.add_paragraph("")
cover.add_paragraph("Dear Hiring Manager,")
cover.add_paragraph(
    "Write one focused paragraph that explains who you are, why you are interested, and how your strengths match the role."
)
cover.add_paragraph("")
cover.add_paragraph("Sincerely,")
cover.add_paragraph("Your Name")
cover.save(cover_letter_out_path)
print(f"Created: {cover_letter_out_path}")
