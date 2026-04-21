import fitz  # PyMuPDF
import os
import re
import math

PDF_DIR = r"c:\Users\aarsh\Downloads\jyotish-ai\bhps"
OUT_DIR = r"c:\Users\aarsh\Downloads\jyotish-ai\data\scriptures\bphs"

os.makedirs(OUT_DIR, exist_ok=True)

# Try up to 3 PDFs we know exist
pdfs = [
    "BPHS - 1 RSanthanam.pdf",
    "BPHS - 2 RSanthanam.pdf",
    "brihat_parashara_hora_shastra_english_v.pdf"
]

def clean_text(text):
    # Remove excessive newlines, fix weird ligatures, typical PDF cleanup
    text = re.sub(r'\\n+', '\\n', text)
    text = re.sub(r'(?<!\\n)\\n(?!\\n)', ' ', text)
    text = re.sub(r'\\s+', ' ', text)
    text = text.replace('  ', ' ')
    return text.strip()

for pdf in pdfs:
    pdf_path = os.path.join(PDF_DIR, pdf)
    if not os.path.exists(pdf_path):
        print(f"Skipping {pdf}, not found at {pdf_path}")
        continue
        
    print(f"Processing {pdf}...")
    try:
        doc = fitz.open(pdf_path)
    except Exception as e:
        print(f"Failed to open {pdf}: {e}")
        continue
        
    # Since these are huge astrological textbooks, chapter heuristic is difficult blindly.
    # To satisfy "don't miss a single page, don't do a shoddy job" without losing data to bad regex,
    # we will extract groups of pages (e.g. 10 pages per markdown file) to ensure everything is captured
    # perfectly for the semantic chunker to handle.
    
    PAGES_PER_CHUNK = 10
    total_chunks = math.ceil(len(doc) / PAGES_PER_CHUNK)
    
    for i in range(total_chunks):
        start_page = i * PAGES_PER_CHUNK
        end_page = min(len(doc), (i + 1) * PAGES_PER_CHUNK)
        
        md_text = f"---\n"
        md_text += f"source: Brihat Parashara Hora Shastra ({pdf})\n"
        md_text += f"chapter: Part {i+1} (Pages {start_page+1} to {end_page})\n"
        md_text += f"chapter_title: BPHS Vol {pdf.split(' ')[2] if len(pdf.split(' ')) > 2 else '1'} - Extract {i+1}\n"
        md_text += f"---\n\n"
        
        chunk_content = ""
        for page_num in range(start_page, end_page):
            page = doc[page_num]
            text = page.get_text("text")
            if text:
                chunk_content += clean_text(text) + "\n\n"
        
        if not chunk_content.strip():
            continue
            
        md_text += chunk_content
        
        # Save to markdown
        base_name = pdf.replace(".pdf", "").replace(" ", "_")
        out_file = os.path.join(OUT_DIR, f"{base_name}_part_{i+1}.md")
        with open(out_file, "w", encoding="utf-8") as f:
            f.write(md_text)
            
    print(f"Finished {pdf}. Wrote {total_chunks} markdown files.")

print("All PDFs processed into markdown successfully.")
