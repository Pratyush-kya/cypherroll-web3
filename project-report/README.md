# Blockchain Project Report: CypherRoll Web3

**Candidate Name:** Pratyush Kiran Rath  
**Registration Number:** 250301120001  
**Program:** Bachelor of Technology in Computer Science & Engineering  
**Department:** School of Engineering and Technology  
**Institution:** Centurion University of Technology and Management, Odisha, India  
**Academic Year:** 2025 – 2026  

---

## Overview

This directory contains the complete academic project report for the **CypherRoll Web3** non-custodial gaming & bankroll system, prepared in accordance with the official Centurion University project report formatting guidelines.

## Contents

1. **`PRATYUSH_RATH_BLOCKCHAIN_PROJECT_REPORT.pdf`**:
   The final compiled 38-page official academic project report in PDF format, complete with university cover page, front matter (Certificate, Declaration, Acknowledgement, Abstract), boxed 3-column Table of Contents, 10 detailed technical chapters, and references.

2. **`PROJECT_REPORT.md`**:
   The complete project report mirrored in GitHub Flavored Markdown for direct browser viewing.

3. **`main.tex` & `sections/`**:
   The modular LaTeX source code for the entire report:
   - `00_cover.tex`: Official Centurion University cover page
   - `00_frontmatter.tex`: Certificate, Declaration, Acknowledgement, Abstract, Boxed TOC
   - `01_introduction.tex`: Chapter 1 — Introduction
   - `02_lit_review.tex`: Chapter 2 — Literature Review
   - `03_sys_architecture.tex`: Chapter 3 — System Architecture & Design
   - `04_provably_fair.tex`: Chapter 4 — Cryptographic Foundations & Provably Fair
   - `05_smart_contracts.tex`: Chapter 5 — Smart Contract Implementation
   - `06_metamask_integration.tex`: Chapter 6 — Web3 Wallet Integration & Multi-Chain Operations
   - `07_security_compliance.tex`: Chapter 7 — Security, Anti-Tamper & AML Compliance
   - `08_testing_verification.tex`: Chapter 8 — Testing, Simulation & Formal Verification
   - `09_deployment.tex`: Chapter 9 — Deployment & Production Infrastructure
   - `10_conclusion.tex`: Chapter 10 — Conclusion & Future Enhancements
   - `11_reference.tex`: References

4. **`images/`**:
   Graphics and university assets used in LaTeX compilation (`cutm_logo.png`).

---

## How to Compile LaTeX Source to PDF

To recompile the PDF using MiKTeX or TeX Live:

```bash
pdflatex -interaction=nonstopmode main.tex
pdflatex -interaction=nonstopmode main.tex
```
*(Running twice ensures Table of Contents, page numbers, and roman numerals synchronize accurately).*
