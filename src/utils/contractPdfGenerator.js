const PDFDocument = require('pdfkit');
const fs = require('fs');

/**
 * Generates a clean PDF for the Law Retainer Agreement (Fees removed & renumbered).
 * @param {object} contractData
 * @param {string} contractData.clientName
 * @param {string} contractData.robloxUsername
 * @param {string} contractData.discordUsername
 * @param {string} contractData.scope
 * @param {string} contractData.signedDate
 * @param {string} outputPath
 * @returns {Promise<string>}
 */
function generateContractPDF(contractData, outputPath) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(outputPath);

    doc.pipe(stream);

    // Title & Subtitle Header
    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .text('Law Office of M_ysticWavezzz', { align: 'center' });
    doc
      .fontSize(10)
      .font('Helvetica')
      .text(`Rev. ${contractData.signedDate || '7/28/2026'}`, { align: 'center' });
    doc.moveDown(1.5);

    // Salutation
    doc
      .fontSize(11)
      .font('Helvetica')
      .text(`Dear, ${contractData.clientName}`);
    doc.moveDown(0.5);
    doc.text(
      'Thank you for choosing the Law Office of Mystic. This letter confirms the terms of our engagement. Please be advised that M_ysticWavezzz (myself) is a fully admitted and ratified attorney authorized to practice unconditionally before the District Courts of the State of Mayflower. All representation is provided in accordance with the Local Rules of the State of Mayflower.'
    );
    doc.moveDown(0.8);

    // Section 1: Scope of Representation
    doc.font('Helvetica-Bold').text('1. Scope of Representation');
    doc
      .font('Helvetica')
      .text(
        `You are retaining me to represent you in connection with: ${contractData.scope || 'Civil Representation'}. This engagement does not extend to any other matter unless we agree to that in writing.`
      );
    doc.moveDown(0.8);

    // Section 2: Student Counsel Consent
    doc.font('Helvetica-Bold').text('2. Student Counsel Consent');
    doc
      .font('Helvetica')
      .text('N/A');
    doc.moveDown(0.8);

    // Section 3: Client Responsibility & Disclosures
    doc.font('Helvetica-Bold').text('3. Client Responsibility & Disclosures');
    doc
      .font('Helvetica')
      .text(
        `You agree to provide complete and truthful information, respond to requests within a reasonable time, and notify me promptly of any change in circumstances relevant to the matter. Under Har. R. Civ. P. Rule 26(a) and Ches. R. Civ. P. Rule 3.3, you must disclose your Roblox username and Discord contact information as part of required disclosures for litigation. Your designated Roblox account is ${contractData.robloxUsername} and your Discord contact is ${contractData.discordUsername}.`
      );
    doc.moveDown(0.8);

    // Section 4: Confidentiality
    doc.font('Helvetica-Bold').text('4. Confidentiality');
    doc
      .font('Helvetica')
      .text(
        'Communications between us are confidential and protected to the fullest extent recognized under the Rules of Professional Conduct issued by the Circuit Court. I will not disclose the substance of our communications to third parties without your consent, except as required by law or court order.'
      );
    doc.moveDown(0.8);

    // Section 5: No Guarantee of Final Outcome
    doc.font('Helvetica-Bold').text('5. No Guarantee of Final Outcome');
    doc
      .font('Helvetica')
      .text(
        'I will represent your interests diligently and in good faith, consistent with my obligations under Har. R. Civ. P. Rule 11. No result can be guaranteed.'
      );
    doc.moveDown(0.8);

    // Section 6: Termination & Withdrawal
    doc.font('Helvetica-Bold').text('6. Termination & Withdrawal');
    doc
      .font('Helvetica')
      .text(
        'Either party may terminate this engagement on written notice. You remain responsible for costs incurred up to the date of termination. Under Local Rule 2.1, once a Notice of Appearance has been filed, our office can only withdraw by order of the court upon showing satisfactory reasons.'
      );
    doc.moveDown(0.8);

    // Section 7: Court Filings
    doc.font('Helvetica-Bold').text('7. Court Filings');
    doc
      .font('Helvetica')
      .text(
        'Any pleading, motion, or other document filed on your behalf will be signed consistent with Har. R. Civ. P. Rule 11(b), meaning I certify, to the best of my knowledge after reasonable inquiry, that it is not filed for an improper purpose and is warranted by the facts and the law.'
      );
    doc.moveDown(1.2);

    // Section 8: Signatories
    doc.font('Helvetica-Bold').text('8. Signatories');
    doc.moveDown(0.5);

    doc.font('Helvetica-Bold').text('CLIENT');
    doc.font('Helvetica').text(`Signature: /s/ ${contractData.clientName}`);
    doc.text(`Printed name and title: ${contractData.clientName.toUpperCase()}`);
    doc.moveDown(1);

    doc.font('Helvetica-Bold').text('REPRESENTING ATTORNEY');
    doc.font('Helvetica').text('Signature: /s/ M_ysticWavezzz');
    doc.text('Printed name and title: Attorney, M_ysticWavezzz');

    doc.end();

    stream.on('finish', () => resolve(outputPath));
    stream.on('error', (err) => reject(err));
  });
}

module.exports = { generateContractPDF };
