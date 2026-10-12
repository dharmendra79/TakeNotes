document.addEventListener('DOMContentLoaded', () => {
    let activeBlock = null;

    // Undo / Redo History Stack Management
    const undoStack = [];
    const redoStack = [];
    const MAX_HISTORY = 50;
    let isHistoryAction = false;
    let inputDebounceTimer = null;

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

    // Save Initial History State
    saveState();

    function saveState() {
        if (isHistoryAction) return;

        const currentHTML = noteDocument.innerHTML;
        // Don't save duplicate identical states
        if (undoStack.length > 0 && undoStack[undoStack.length - 1] === currentHTML) {
            return;
        }

        undoStack.push(currentHTML);
        if (undoStack.length > MAX_HISTORY) undoStack.shift();

        // Clear redo stack on new action
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
        floatingToolbar.style.display = 'none';
        activeBlock = null;

        // Re-apply Prism formatting on restored code blocks
        if (window.Prism) {
            Prism.highlightAllUnder(noteDocument);
        }
    }

    // Debounced text input tracking for undo history
    noteDocument.addEventListener('input', () => {
        clearTimeout(inputDebounceTimer);
        inputDebounceTimer = setTimeout(() => {
            saveState();
        }, 500);
    });

    // Style Controls Event Listeners
    fontSelect.addEventListener('change', updateStyles);
    inkSelect.addEventListener('change', updateStyles);
    paperSelect.addEventListener('change', updateStyles);

    // Header Actions
    document.getElementById('btnReset').addEventListener('click', () => location.reload());
    document.getElementById('btnExportHtml').addEventListener('click', () => exportHTML(noteDocument));
    document.getElementById('btnExportPdf').addEventListener('click', () => generatePDF(noteDocument, floatingToolbar));
    
    if (btnUndo) btnUndo.addEventListener('click', undo);
    if (btnRedo) btnRedo.addEventListener('click', redo);

    // Toolbar Actions
    document.getElementById('btnMoveUp').addEventListener('click', () => moveBlock(-1));
    document.getElementById('btnMoveDown').addEventListener('click', () => moveBlock(1));
    document.getElementById('btnDeleteBlock').addEventListener('click', deleteBlock);
    document.getElementById('imageUploader').addEventListener('change', handleImageUpload);

    // Dynamic Language Switcher Listener
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

    // Keyboard Shortcuts (Ctrl+Z / Cmd+Z, Ctrl+Y / Cmd+Y, Tab Key)
    document.addEventListener('keydown', (e) => {
        const isCmdOrCtrl = e.metaKey || e.ctrlKey;

        // Shortcuts for Undo & Redo
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
        }

        // Tab Key Indentation
        if (e.target && e.target.classList.contains('code-editor') && e.key === 'Tab') {
            e.preventDefault();
            const selection = window.getSelection();
            const range = selection.getRangeAt(0);
            const tabNode = document.createTextNode('    '); // 4 Spaces
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
            floatingToolbar.style.display = 'none';
            activeBlock = null;
        }
    });

    function positionToolbar(block) {
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
        const newBlock = createBlockElement(type);
        activeBlock.parentNode.insertBefore(newBlock, activeBlock.nextSibling);
        floatingToolbar.style.display = 'none';
        saveState();
    }

    function appendBlock(type) {
        const newBlock = createBlockElement(type);
        noteDocument.appendChild(newBlock);
        saveState();
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
            floatingToolbar.style.display = 'none';
            activeBlock = null;
            saveState();
        }
    }

    function updateStyles() {
        noteDocument.style.setProperty('--note-font', fontSelect.value);
        noteDocument.style.setProperty('--note-ink', inkSelect.value);
        noteDocument.className = `note-page ${paperSelect.value}`;
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

    updateStyles();
});