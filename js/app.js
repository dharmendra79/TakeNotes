document.addEventListener('DOMContentLoaded', () => {
    let activeBlock = null;
    let currentDocId = null;

    // Undo / Redo History Stack
    const undoStack = [];
    const redoStack = [];
    const MAX_HISTORY = 50;
    let isHistoryAction = false;
    let inputDebounceTimer = null;

    const STORAGE_KEY = 'notecraft_saved_notes';

    const codeSamples = {
        python: `# Formula: Net Primary Productivity (NPP) = GPP - Respiration
def calculate_npp(gross_primary_productivity, respiration_loss):
    """Calculates net energy available to herbivores."""
    net_productivity = gross_primary_productivity - respiration_loss
    return f"{net_productivity} kcal/m²/yr"

print(calculate_npp(10000, 4500))`,

        javascript: `// Formula: Net Primary Productivity (NPP) = GPP - Respiration
function calculateNPP(gpp, respiration) {
    const netProductivity = gpp - respiration;
    return \`\${netProductivity} kcal/m²/yr\`;
}

console.log(calculateNPP(10000, 4500));`,

        cpp: `// Formula: Net Primary Productivity (NPP) = GPP - Respiration
#include <iostream>

double calculateNPP(double gpp, double respiration) {
    return gpp - respiration;
}

int main() {
    double npp = calculateNPP(10000.0, 4500.0);
    std::cout << "NPP: " << npp << " kcal/m²/yr" << std::endl;
    return 0;
}`,

        java: `// Formula: Net Primary Productivity (NPP) = GPP - Respiration
public class Ecosystem {
    public static double calculateNPP(double gpp, double respiration) {
        return gpp - respiration;
    }

    public static void main(String[] args) {
        double npp = calculateNPP(10000.0, 4500.0);
        System.out.println("NPP: " + npp + " kcal/m²/yr");
    }
}`,

        html: `<!-- Sample Ecosystem Component -->
<div class="ecosystem-card">
    <h3>Trophic Level Analysis</h3>
    <p>Energy Available: <span id="npp-value">5500 kcal/m²/yr</span></p>
</div>`,

        sql: `-- Calculate Total Ecosystem Energy Production
SELECT 
    ecosystem_id,
    gross_primary_productivity - respiration_loss AS net_primary_productivity
FROM ecosystem_metrics
WHERE year = 2026;`,

        go: `// Formula: Net Primary Productivity (NPP) = GPP - Respiration
package main

import "fmt"

func calculateNPP(gpp, respiration float64) float64 {
    return gpp - respiration
}

func main() {
    npp := calculateNPP(10000.0, 4500.0);
    fmt.Printf("NPP: %.2f kcal/m²/yr\n", npp)
}`,

        rust: `// Formula: Net Primary Productivity (NPP) = GPP - Respiration
fn calculate_npp(gpp: f64, respiration: f64) -> f64 {
    gpp - respiration
}

fn main() {
    let npp = calculate_npp(10000.0, 4500.0);
    println!("NPP: {} kcal/m²/yr", npp);
}`,

        typescript: `// Formula: Net Primary Productivity (NPP) = GPP - Respiration
function calculateNPP(gpp: number, respiration: number): string {
    const netProductivity: number = gpp - respiration;
    return \`\${netProductivity} kcal/m²/yr\`;
}

console.log(calculateNPP(10000, 4500));`,

        bash: `#!/bin/bash
# Calculate Net Primary Productivity
GPP=10000
RESPIRATION=4500
NPP=$((GPP - RESPIRATION))

echo "Net Primary Productivity: \${NPP} kcal/m²/yr"`
    };

    const noteDocument = document.getElementById('noteDocument');
    const canvasArea = document.getElementById('canvasArea');
    const floatingToolbar = document.getElementById('floatingToolbar');
    const fontSelect = document.getElementById('fontSelect');
    const inkSelect = document.getElementById('inkSelect');
    const paperSelect = document.getElementById('paperSelect');
    const btnUndo = document.getElementById('btnUndo');
    const btnRedo = document.getElementById('btnRedo');
    const currentDocNameInput = document.getElementById('currentDocName');
    const savedNotesList = document.getElementById('savedNotesList');

    // -------------------------------------------------------------
    // LOCAL STORAGE OPERATIONS
    // -------------------------------------------------------------
    function getStoredNotes() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
        } catch (e) {
            console.error("LocalStorage Error:", e);
            return {};
        }
    }

    function saveNoteToDisk() {
        const docName = (currentDocNameInput ? currentDocNameInput.value.trim() : '') || 'Untitled Note';
        const notes = getStoredNotes();
        
        if (!currentDocId) {
            currentDocId = 'doc_' + Date.now();
        }

        notes[currentDocId] = {
            id: currentDocId,
            title: docName,
            font: fontSelect ? fontSelect.value : '',
            ink: inkSelect ? inkSelect.value : '',
            paper: paperSelect ? paperSelect.value : '',
            htmlContent: noteDocument.innerHTML,
            updatedAt: new Date().toLocaleString()
        };

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
            renderSavedNotesList();
            alert(`Saved "${docName}" successfully to local disk!`);
        } catch (e) {
            alert('Failed to save note. Local storage space might be full.');
        }
    }

    function loadNoteFromDisk(id) {
        const notes = getStoredNotes();
        const doc = notes[id];
        if (!doc) return;

        currentDocId = doc.id;
        if (currentDocNameInput) currentDocNameInput.value = doc.title;
        if (fontSelect && doc.font) fontSelect.value = doc.font;
        if (inkSelect && doc.ink) inkSelect.value = doc.ink;
        if (paperSelect && doc.paper) paperSelect.value = doc.paper;

        restoreDocumentState(doc.htmlContent);
        updateStyles();
        renderSavedNotesList();
    }

    function deleteNoteFromDisk(id, event) {
        if (event) event.stopPropagation();
        if (!confirm('Are you sure you want to delete this saved note?')) return;

        const notes = getStoredNotes();
        delete notes[id];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));

        if (currentDocId === id) {
            currentDocId = null;
        }
        renderSavedNotesList();
    }

    function createNewNote() {
        currentDocId = null;
        const noteCount = Object.keys(getStoredNotes()).length + 1;
        if (currentDocNameInput) {
            currentDocNameInput.value = "New Note " + noteCount;
        }
        noteDocument.innerHTML = `
            <div class="note-block"><h1 contenteditable="true">📌 NEW STUDY NOTE ${noteCount}</h1></div>
            <div class="note-block"><p contenteditable="true">Start typing your new handwritten note here...</p></div>`;
        saveState();
        renderSavedNotesList();
    }

    function renderSavedNotesList() {
        if (!savedNotesList) return;
        const notes = getStoredNotes();
        savedNotesList.innerHTML = '';

        const keys = Object.keys(notes);
        if (keys.length === 0) {
            savedNotesList.innerHTML = `<div style="font-size:0.75rem; color: var(--text-muted); text-align:center; padding:6px;">No saved notes found.</div>`;
            return;
        }

        keys.forEach(id => {
            const item = notes[id];
            const div = document.createElement('div');
            div.className = `saved-item ${currentDocId === id ? 'active' : ''}`;
            div.innerHTML = `
                <span class="saved-item-title" title="${item.title}">${item.title}</span>
                <div class="saved-item-actions">
                    <button class="btn-icon btn-icon-danger" title="Delete Note">🗑️</button>
                </div>`;

            div.addEventListener('click', () => loadNoteFromDisk(id));
            const deleteBtn = div.querySelector('.btn-icon-danger');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => deleteNoteFromDisk(id, e));
            }
            savedNotesList.appendChild(div);
        });
    }

    // -------------------------------------------------------------
    // UNDO / REDO HISTORY SYSTEM
    // -------------------------------------------------------------
    saveState();

    function saveState() {
        if (isHistoryAction) return;

        const currentHTML = noteDocument.innerHTML;
        if (undoStack.length > 0 && undoStack[undoStack.length - 1] === currentHTML) {
            return;
        }

        undoStack.push(currentHTML);
        if (undoStack.length > MAX_HISTORY) undoStack.shift();

        redoStack.length = 0;
        updateUndoRedoUI();
    }

    function updateUndoRedoUI() {
        if (btnUndo) btnUndo.disabled = undoStack.length <= 1;
        if (btnRedo) btnRedo.disabled = redoStack.length === 0;
    }

    function undo() {
        if (undoStack.length <= 1) return;

        isHistoryAction = true;
        const currentState = undoStack.pop();
        redoStack.push(currentState);

        const previousState = undoStack[undoStack.length - 1];
        restoreDocumentState(previousState);

        isHistoryAction = false;
        updateUndoRedoUI();
    }

    function redo() {
        if (redoStack.length === 0) return;

        isHistoryAction = true;
        const nextState = redoStack.pop();
        undoStack.push(nextState);

        restoreDocumentState(nextState);

        isHistoryAction = false;
        updateUndoRedoUI();
    }

    function restoreDocumentState(htmlContent) {
        noteDocument.innerHTML = htmlContent;
        if (floatingToolbar) floatingToolbar.style.display = 'none';
        activeBlock = null;

        if (window.Prism) {
            Prism.highlightAllUnder(noteDocument);
        }
    }

    noteDocument.addEventListener('input', () => {
        clearTimeout(inputDebounceTimer);
        inputDebounceTimer = setTimeout(() => {
            saveState();
        }, 500);
    });

    // Style Controls Event Listeners
    if (fontSelect) fontSelect.addEventListener('change', updateStyles);
    if (inkSelect) inkSelect.addEventListener('change', updateStyles);
    if (paperSelect) paperSelect.addEventListener('change', updateStyles);

    // Header Button Listeners
    const btnExportHtml = document.getElementById('btnExportHtml');
    const btnExportPdf = document.getElementById('btnExportPdf');
    const btnSaveDoc = document.getElementById('btnSaveDoc');
    const btnNewDoc = document.getElementById('btnNewDoc');

    if (btnExportHtml) btnExportHtml.addEventListener('click', () => exportHTML(noteDocument));
    if (btnExportPdf) btnExportPdf.addEventListener('click', () => generatePDF(noteDocument, floatingToolbar));
    if (btnSaveDoc) btnSaveDoc.addEventListener('click', saveNoteToDisk);
    if (btnNewDoc) btnNewDoc.addEventListener('click', createNewNote);

    if (btnUndo) btnUndo.addEventListener('click', undo);
    if (btnRedo) btnRedo.addEventListener('click', redo);

    // Toolbar Move/Delete Actions
    const btnMoveUp = document.getElementById('btnMoveUp');
    const btnMoveDown = document.getElementById('btnMoveDown');
    const btnDeleteBlock = document.getElementById('btnDeleteBlock');
    const imageUploader = document.getElementById('imageUploader');

    if (btnMoveUp) btnMoveUp.addEventListener('click', () => moveBlock(-1));
    if (btnMoveDown) btnMoveDown.addEventListener('click', () => moveBlock(1));
    if (btnDeleteBlock) btnDeleteBlock.addEventListener('click', deleteBlock);
    if (imageUploader) imageUploader.addEventListener('change', handleImageUpload);

    // Code Language Switcher
    document.addEventListener('change', (e) => {
        if (e.target && e.target.classList.contains('code-lang-select')) {
            const lang = e.target.value;
            const container = e.target.closest('.code-block-container');
            const codeEditor = container ? container.querySelector('.code-editor') : null;
            
            if (codeEditor && codeSamples[lang]) {
                codeEditor.className = `code-editor language-${lang}`;
                codeEditor.innerHTML = `<code>${escapeHTML(codeSamples[lang])}</code>`;
                if (window.Prism) Prism.highlightAllUnder(container);
                saveState();
            }
        }
    });

    // Shortcuts (Ctrl+S, Ctrl+Z, Ctrl+Y, Tab)
    document.addEventListener('keydown', (e) => {
        const isCmdOrCtrl = e.metaKey || e.ctrlKey;

        if (isCmdOrCtrl && e.key.toLowerCase() === 'z') {
            if (e.shiftKey) {
                e.preventDefault();
                redo();
            } else {
                e.preventDefault();
                undo();
            }
        } else if (isCmdOrCtrl && e.key.toLowerCase() === 'y') {
            e.preventDefault();
            redo();
        } else if (isCmdOrCtrl && e.key.toLowerCase() === 's') {
            e.preventDefault();
            saveNoteToDisk();
        }

        if (e.target && e.target.classList.contains('code-editor') && e.key === 'Tab') {
            e.preventDefault();
            const selection = window.getSelection();
            const range = selection.getRangeAt(0);
            const tabNode = document.createTextNode('    ');
            range.insertNode(tabNode);
            range.setStartAfter(tabNode);
            range.setEndAfter(tabNode);
            selection.removeAllRanges();
            selection.addRange(range);
            saveState();
        }
    });

    function escapeHTML(str) {
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    document.querySelectorAll('[data-action="append"]').forEach(btn => {
        btn.addEventListener('click', (e) => appendBlock(e.target.dataset.type));
    });

    document.querySelectorAll('[data-action="insert"]').forEach(btn => {
        btn.addEventListener('click', (e) => insertRelative(e.target.dataset.type));
    });

    document.addEventListener('click', (e) => {
        const block = e.target.closest('.note-block');
        if (block && noteDocument.contains(block)) {
            activeBlock = block;
            positionToolbar(block);
        } else if (!floatingToolbar.contains(e.target)) {
            if (floatingToolbar) floatingToolbar.style.display = 'none';
            activeBlock = null;
        }
    });

    function positionToolbar(block) {
        if (!floatingToolbar) return;
        const rect = block.getBoundingClientRect();
        const canvasRect = canvasArea.getBoundingClientRect();

        floatingToolbar.style.display = 'flex';
        floatingToolbar.style.top = `${rect.top - canvasRect.top + canvasArea.scrollTop - 36}px`;
        floatingToolbar.style.left = `${rect.left - canvasRect.left + 10}px`;
    }

    function createBlockElement(type) {
        const div = document.createElement('div');
        div.className = 'note-block';

        if (type === 'heading') {
            div.innerHTML = `<h2 contenteditable="true">New Section Heading</h2>`;
        } else if (type === 'paragraph') {
            div.innerHTML = `<p contenteditable="true">Type your paragraph note content here...</p>`;
        } else if (type === 'bullets') {
            div.innerHTML = `<ul><li contenteditable="true">First bullet point...</li><li contenteditable="true">Second bullet point...</li></ul>`;
        } else if (type === 'callout') {
            div.innerHTML = `<div class="callout-box" contenteditable="true"><strong>KEY RULE:</strong> Type highlighted content here...</div>`;
        } else if (type === 'code') {
            div.innerHTML = `
                <div class="code-block-container">
                    <div class="code-header">
                        <select class="code-lang-select">
                            <option value="python" selected>Python</option>
                            <option value="javascript">JavaScript</option>
                            <option value="cpp">C / C++</option>
                            <option value="java">Java</option>
                            <option value="html">HTML / CSS</option>
                            <option value="sql">SQL</option>
                            <option value="go">Go</option>
                            <option value="rust">Rust</option>
                            <option value="typescript">TypeScript</option>
                            <option value="bash">Bash / Shell</option>
                        </select>
                        <span style="color:#94a3b8; font-size:12px;">•••</span>
                    </div>
                    <pre class="code-editor language-python" contenteditable="true"><code>${escapeHTML(codeSamples['python'])}</code></pre>
                </div>`;
            setTimeout(() => { if (window.Prism) Prism.highlightAllUnder(div); }, 50);
        }
        return div;
    }

    function insertRelative(type) {
        if (!activeBlock) return;

        if (type === 'bullets') {
            const targetList = activeBlock.querySelector('ul') || activeBlock.closest('ul');
            if (targetList) {
                const newLi = document.createElement('li');
                newLi.contentEditable = "true";
                newLi.innerText = "New bullet point...";
                targetList.appendChild(newLi);
                focusElement(newLi);
                if (floatingToolbar) floatingToolbar.style.display = 'none';
                saveState();
                return;
            }
        }

        const newBlock = createBlockElement(type);
        activeBlock.parentNode.insertBefore(newBlock, activeBlock.nextSibling);
        if (floatingToolbar) floatingToolbar.style.display = 'none';
        saveState();
    }

    function appendBlock(type) {
        if (type === 'bullets') {
            const lists = noteDocument.querySelectorAll('ul');
            if (lists.length > 0) {
                const lastList = lists[lists.length - 1];
                const newLi = document.createElement('li');
                newLi.contentEditable = "true";
                newLi.innerText = "New bullet point...";
                lastList.appendChild(newLi);
                focusElement(newLi);
                saveState();
                return;
            }
        }

        const newBlock = createBlockElement(type);
        noteDocument.appendChild(newBlock);
        saveState();
    }

    function focusElement(el) {
        el.focus();
        const range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    }

    function moveBlock(direction) {
        if (!activeBlock) return;
        if (direction === -1 && activeBlock.previousElementSibling) {
            activeBlock.parentNode.insertBefore(activeBlock, activeBlock.previousElementSibling);
            saveState();
        } else if (direction === 1 && activeBlock.nextElementSibling) {
            activeBlock.parentNode.insertBefore(activeBlock.nextElementSibling, activeBlock);
            saveState();
        }
        positionToolbar(activeBlock);
    }

    function deleteBlock() {
        if (activeBlock) {
            activeBlock.remove();
            if (floatingToolbar) floatingToolbar.style.display = 'none';
            activeBlock = null;
            saveState();
        }
    }

    function updateStyles() {
        if (!noteDocument) return;
        if (fontSelect) noteDocument.style.setProperty('--note-font', fontSelect.value);
        if (inkSelect) noteDocument.style.setProperty('--note-ink', inkSelect.value);
        if (paperSelect) noteDocument.className = `note-page ${paperSelect.value}`;
    }

    function handleImageUpload(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (evt) => {
                insertImage(evt.target.result);
                saveState();
            };
            reader.readAsDataURL(file);
        }
    }

    function insertImage(src) {
        const div = document.createElement('div');
        div.className = "note-block";
        div.innerHTML = `<div class="image-frame"><img src="${src}" alt="Diagram"><p contenteditable="true" style="font-size:0.9rem; margin-top:4px;"><em>Figure: Diagram caption</em></p></div>`;
        
        if (activeBlock) {
            activeBlock.parentNode.insertBefore(div, activeBlock.nextSibling);
        } else {
            noteDocument.appendChild(div);
        }
        saveState();
    }

    // Initialize UI and render saved notes list on startup
    updateStyles();
    renderSavedNotesList();
});