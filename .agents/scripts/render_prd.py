import fitz
from pathlib import Path
path = 'attached_assets/PRD_1788169484683.pdf'
out = Path('.agents/outputs/prd-pages')
out.mkdir(parents=True, exist_ok=True)
doc = fitz.open(path)
for i, page in enumerate(doc):
    pix = page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5), alpha=False)
    pix.save(str(out / f'page-{i+1}.png'))
print(f'rendered {doc.page_count} pages to {out}')
