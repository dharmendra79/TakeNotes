/**
 * NoteCraft Studio — PDF & HTML Exporter Module
 */

function generatePDF(element, toolbar) {
    if (!element) {
        console.error('PDF Exporter Error: Note document container not found.');
        return;
    }

    if (toolbar) {
        toolbar.style.display = 'none';
    }

    const options = {
        margin: [0, 0, 0, 0],
        filename: 'Handwritten_Notes.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
            scale: 2,
            useCORS: true,
            logging: false,
            letterRendering: true
        },
        jsPDF: {
            unit: 'mm',
            format: 'a4',
            orientation: 'portrait'
        },
        pagebreak: { mode: ['css', 'legacy'] }
    };

    html2pdf()
        .set(options)
        .from(element)
        .save()
        .catch((err) => {
            console.error('PDF Generation Failed:', err);
        });
}

function exportHTML(element) {
    if (!element) {
        console.error('HTML Exporter Error: Note document container not found.');
        return;
    }

    const content = element.outerHTML;
    const fullDocument = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Handwritten Notes Export</title>
    <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@600&family=Fira+Code:wght@400;500&family=Patrick+Hand&display=swap" rel="stylesheet">
    <style>
        body { display: flex; justify-content: center; padding: 20px; background: #f1f5f9; margin: 0; font-family: sans-serif; }
        .note-page { width: 210mm; min-height: 297mm; padding: 20mm; background: #fefcf6; font-family: 'Patrick Hand', cursive; color: #1e3a8a; line-height: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); box-sizing: border-box; }
        h1 { font-family: 'Caveat', cursive; font-size: 2.75rem; text-align: center; border-bottom: 2px dashed #1e3a8a; margin-bottom: 10px; }
        h2 { font-family: 'Caveat', cursive; font-size: 2rem; border-left: 4px solid #1e3a8a; padding-left: 10px; margin-top: 15px; }
        p, li { font-size: 1.25rem; }
        ul { margin-left: 24px; }
        .callout-box { border: 2px dashed #1e3a8a; background: rgba(30, 58, 138, 0.04); padding: 12px 16px; border-radius: 6px; margin: 16px 0; }
        .image-frame img { max-width: 90%; border: 6px solid #fff; box-shadow: 0 4px 10px rgba(0,0,0,0.15); border-radius: 4px; }
        .code-block-container { background: #1e293b; border: 2px dashed #1e3a8a; border-radius: 6px; margin: 12px 0; color: #f8fafc; }
        .code-header { background: rgba(15, 23, 42, 0.8); padding: 6px 12px; font-size: 0.8rem; color: #38bdf8; font-family: sans-serif; }
        .code-editor { padding: 12px; margin: 0; font-family: 'Fira Code', monospace; font-size: 0.95rem; white-space: pre-wrap; }
        .note-block { margin-bottom: 8px; }
    </style>
</head>
<body>
    ${content}
</body>
</html>`;

    const blob = new Blob([fullDocument], { type: 'text/html' });
    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.download = 'handwritten_notes.html';
    downloadLink.click();
    URL.revokeObjectURL(downloadLink.href);
}