const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { validateRobloxUsername } = require('./roblox');
const { addApplication } = require('./dbStore');
const config = require('../../config.json');

// Map of active user DM sessions: userId -> sessionObj
const dmSessions = new Map();

const examQuestionsData = [
  {
    id: 1,
    title: "Question 1: The Right to Pre-Trial Release",
    scenario: "Scenario: A defendant is arrested in Lander City and charged with eight (8) separate active-status felony counts of a highly violent nature, including Assault with a Deadly Weapon. The prosecution immediately files a Motion for Pre-Trial Detention, demanding the defendant be held without bail pending trial. They argue that the defendant represents a severe flight risk and a threat to public safety, but they do not charge the defendant with Homicide, Treason, Criminal Anarchy, or Espionage.\n\nHow must the District Court rule on the prosecution's motion?",
    options: {
      A: "A) Grant the motion; the court has inherent discretion to deny bail for multiple violent felonies.",
      B: "B) Deny the motion; the defendant possesses an absolute constitutional right to bail for these offenses.",
      C: "C) Grant the motion, but only if the National Guard is currently activated by the Governor.",
      D: "D) Deny the motion, but only if the defendant agrees to waive their right to a speedy trial."
    },
    correct: "B"
  },
  {
    id: 2,
    title: "Question 2: National Guard Peacetime Jurisdiction",
    scenario: "Scenario: During peacetime, a civilian is stopped, searched, and detained by an ordinary National Guard soldier at a regional hospital parking lot, which is located several miles away from any military base. The soldier is not a member of the Military Police and possesses no warrant. The state seeks to prosecute the civilian for resisting this detention, arguing the Guard acted under its broad authority as a state defense force.\n\nWas the military detention of the civilian lawful?",
    options: {
      A: "A) Yes; the National Guard has statewide police authority during peacetime under Article VIII of the Constitution.",
      B: "B) Yes, because military personnel are automatically considered peace officers while in uniform.",
      C: "C) No; ordinary guardsmen may only detain civilians within the direct vicinity of a Military Installation.",
      D: "D) No, because the National Guard is completely forbidden from executing detentions under any circumstances."
    },
    correct: "C"
  },
  {
    id: 3,
    title: "Question 3: Unauthorized Practice of Law (UPL) with Compensated Representation",
    scenario: "Scenario: An individual who is not certified by the State Bar of Mayflower represents a defendant in a criminal proceeding in the Rockford District Court. The unlicensed individual charges the defendant a fee of $10,000 for their representation. The Department of Justice discovers the arrangement and prosecutes the individual under the Pearson Specter Litt Act.\n\nWhat is the maximum criminal penalty the individual faces upon conviction?",
    options: {
      A: "A) Up to 60 minutes in prison, a citation fine of $45,000, or both.",
      B: "B) Up to 120 minutes in prison, a citation fine of up to $60,000 (or four times the amount charged, whichever is greater), or both.",
      C: "C) Administrative disbarment and a permanent ban from applying to the State Bar.",
      D: "D) A civil citation of $10,000 with no potential prison sentence."
    },
    correct: "B"
  },
  {
    id: 4,
    title: "Question 4: Criminal Trial Sentencing Multipliers",
    scenario: "Scenario: A defendant is charged with the active-status misdemeanor of Evasion under 1 M.S.C. § 1307. The standard active-status prison sentence for this misdemeanor is exactly 15 minutes. Rather than accepting a plea deal, the defendant exercises their right to a jury trial. The jury finds the defendant guilty.\n\nWhat is the maximum incarceration time the sentencing judge can legally award for this conviction?",
    options: {
      A: "A) 15 minutes (the standard statutory sentence).",
      B: "B) 195 minutes (3.25 hours).",
      C: "C) 225 minutes (3.75 hours).",
      D: "D) 270 minutes (4.5 hours)."
    },
    correct: "B"
  },
  {
    id: 5,
    title: "Question 5: Mayflower Tort Claims Act Damage Caps",
    scenario: "Scenario: A plaintiff files a civil action under the Mayflower Tort Claims Act against a private citizen for the tort of Battery. The plaintiff proves by a preponderance of the evidence that the defendant brought about an unconsented, harmful contact with their person. The jury finds the defendant liable and seeks to award punitive damages.\n\nWhat is the maximum statutory cap on punitive damages that can be awarded for this specific tort, assuming no aggravating patterns of repeated misconduct are proven?",
    options: {
      A: "A) $150,000",
      B: "B) $200,000",
      C: "C) $230,000",
      D: "D) $300,000"
    },
    correct: "C"
  },
  {
    id: 6,
    title: "Question 6: Government Tort Claims Procedure",
    scenario: "Scenario: An individual's vehicle is severely damaged by a Department of Transportation maintenance truck due to the driver's gross negligence. The individual immediately files a civil lawsuit for money damages in the District Court. The Solicitor General moves to dismiss the lawsuit, pointing out that the plaintiff did not submit the claim to the Department of Justice first.\n\nHow must the court rule on the Solicitor General's motion?",
    options: {
      A: "A) Deny the motion; citizens may sue the state directly in court for active torts.",
      B: "B) Dismiss the lawsuit; presenting the claim to the DOJ and receiving a final written denial is an absolute statutory prerequisite to filing a lawsuit.",
      C: "C) Deny the motion, but order the plaintiff to complete 10 hours of mediation before proceeding to trial.",
      D: "D) Dismiss the lawsuit, but only if the Solicitor General agrees to pay the plaintiff's court costs."
    },
    correct: "B"
  },
  {
    id: 7,
    title: "Question 7: The 'At-Will Junior' Dismissal Mandate",
    scenario: "Scenario: A non-conditional (full-time) employee of the Mayflower State Police is abruptly terminated by command staff. The supervisor tells the employee: 'We are an at-will state, so we do not need to give you a reason or a review. You're fired.' The employee challenges the discharge in court, proving they were never given a performance evaluation or a chance to correct deficiencies.\n\nIs the department's 'at-will' discharge of the employee legally valid?",
    options: {
      A: "A) Yes; command staff in all departments retain absolute, unreviewable power to discharge any employee at any time under 4 M.S.C. 7 § 4101.",
      B: "B) Yes, provided the department files a budget statement showing a temporary deficit.",
      C: "C) No; traditional at-will termination is inactive, and the department must find cause in a performance review and afford due process.",
      D: "D) No, but only if the employee has been employed for less than one month."
    },
    correct: "C"
  },
  {
    id: 8,
    title: "Question 8: Dual Office Holding (The Sado-Bear Act)",
    scenario: "Scenario: A sitting member of the Mayflower Senate runs for and successfully wins election to the Office of the Sheriff of Clark County. Upon the certification of the Sheriff election results, the newly elected Sheriff attempts to continue serving as a State Senator, claiming they can fulfill the duties of both offices concurrently.\n\nWhat is the legal status of the individual's legislative and law enforcement offices?",
    options: {
      A: "A) They may hold both offices concurrently upon receiving a majority confirmation vote of the Senate.",
      B: "B) They are deemed to have automatically vacated their Senate seat the moment they assumed the duties of the Sheriff's Office.",
      C: "C) The Sheriff election is declared void as a matter of law, and they must remain a Senator.",
      D: "D) The Governor must select which of the two offices the individual is permitted to retain."
    },
    correct: "B"
  },
  {
    id: 9,
    title: "Question 9: Checkpoint Operational Limits",
    scenario: "Scenario: The Mayflower State Police establishes a traffic checkpoint on a state highway to inspect vehicle registrations. A driver is stopped at the checkpoint. The officers have no reasonable suspicion or probable cause regarding any crime committed by this driver. The officers keep the driver detained at the checkpoint for nine (9) minutes while slowly verifying their driver's license.\n\nIs the duration of this checkpoint detention legally permissible?",
    options: {
      A: "A) Yes; checkpoints are governed by the Police Detainment Act, which allows up to 12 minutes for any standard detention.",
      B: "B) Yes, because checkpoint detentions are completely exempt from statutory time limits.",
      C: "C) No; checkpoint stops are presumed unreasonable if they last longer than five (5) minutes without independent reasonable suspicion or probable cause.",
      D: "D) No, because checkpoints can only be established on municipal roads, not state highways."
    },
    correct: "C"
  },
  {
    id: 10,
    title: "Question 10: Electoral Integrity and Multiple Ballots",
    scenario: "Scenario: During a highly contested state election, a registered voter attempts to maximize their candidate's chances by casting two separate ballots under their own registered name at different polling stations. The voter is caught by the Mayflower Electoral Commission.\n\nWhat class of crime has the voter committed under Mayflower law?",
    options: {
      A: "A) Infraction; carrying a standard fine of $150.",
      B: "B) Misdemeanor; carrying a standard sentence of 5 minutes in jail.",
      C: "C) Felony; carrying a standard sentence of a felony class conviction.",
      D: "D) None; casting multiple ballots is an administrative voting error, not a criminal offense."
    },
    correct: "C"
  },
  {
    id: 11,
    title: "Question 11: Legislative Power and Impeachment Suspensions",
    scenario: "Scenario: The Mayflower State Senate formalizes and files Articles of Impeachment against a county Sheriff. In their initial resolution, the Senate votes to suspend the Sheriff from office pending their trial in the Supreme Court. The resolution dictates that the suspension shall remain in effect for ten (10) calendar days. The Sheriff challenges the suspension in court, arguing the Senate exceeded its constitutional limits.\n\nHow must the court rule on the Sheriff’s challenge?",
    options: {
      A: "A) Deny the challenge; the Senate possesses broad legislative discretion to suspend impeached officers until the trial is complete.",
      B: "B) Grant the challenge; the Senate has no authority to suspend an officer prior to a full conviction.",
      C: "C) Grant the challenge, but only to reduce the suspension; the Constitution strictly limits an impeachment suspension to no more than one week.",
      D: "D) Deny the challenge, but only if the Governor formally countersigns the suspension order."
    },
    correct: "C"
  },
  {
    id: 12,
    title: "Question 12: Supreme Court Advisory Jurisdictions",
    scenario: "Scenario: The Mayor of Lander City is preparing a local municipal ordinance regulating public storefronts. Before putting the ordinance to a vote, the Mayor submits a formal petition to the Mayflower Supreme Court, requesting an advisory opinion on whether the proposed text violates the state's commercial codes. The Supreme Court declines to issue an opinion, and the Mayor appeals.\n\nWas the Supreme Court legally justified in refusing the Mayor's request?",
    options: {
      A: "A) No; the Supreme Court is constitutionally required to issue advisory opinions to any public official who requests one.",
      B: "B) Yes; the Supreme Court is only constitutionally required to issue advisory opinions when requested by the Governor, Lieutenant Governor, Attorney General, or the State Senate by Resolution.",
      C: "C) No, because municipal mayors hold judicial equity standing under Article XI, Section 2.",
      D: "D) Yes, but only if the Chief Judge of the District Court has already ruled on the matter."
    },
    correct: "B"
  },
  {
    id: 13,
    title: "Question 13: Constitutional Exceptions to Double Jeopardy",
    scenario: "Scenario: A defendant is prosecuted in the Clark County District Court for the crime of Treason (1 M.S.C. § 1105). Following a full trial, the jury returns a verdict of not guilty. Unhappy with the outcome, the Department of Justice uncovers new evidence of the exact same underlying acts and refiles identical Treason charges against the defendant in New Haven County. The defense moves to dismiss the new indictment on the grounds of Double Jeopardy.\n\nHow must the presiding judge rule on the defendant's motion to dismiss?",
    options: {
      A: "A) Grant the motion; Double Jeopardy is an absolute bar to re-prosecuting any acquitted defendant.",
      B: "B) Deny the motion; the Mayflower Constitution explicitly excludes Treason from the protection against Double Jeopardy.",
      C: "C) Grant the motion, because Treason is a federal matter over which the state has no secondary jurisdiction.",
      D: "D) Deny the motion, but only if a capital jury unanimously consents to the second trial."
    },
    correct: "B"
  },
  {
    id: 14,
    title: "Question 14: Perjury and Sworn Affirmations",
    scenario: "Scenario: During an administrative hearing before the Medical Review Board, a public official is sworn under oath by the Sergeant-at-Arms. To protect their job, the official knowingly and falsely testifies that they were present in-game during a mandatory cycle. The Department of Justice discovers the lie and prosecutes them for Perjury (1 M.S.C. § 1504).\n\nWhich of the following elements must the prosecution prove to secure a conviction for Perjury?",
    options: {
      A: "A) The defendant made a false statement, regardless of whether they were under oath or if the statement was material.",
      B: "B) The defendant willfully subscribed as true a material matter they did not believe to be true, under an authorized oath before a competent tribunal, officer, or person.",
      C: "C) The defendant’s false statement resulted in a direct economic loss to the state budget exceeding $50,000.",
      D: "D) The defendant made the false statement while actively on-duty as a primary law enforcement officer."
    },
    correct: "B"
  },
  {
    id: 15,
    title: "Question 15: Felony Statute of Limitations",
    scenario: "Scenario: A defendant commits Armed Robbery (1 M.S.C. § 3101), utilizing a firearm to steal cash from a cashier. The police complete their investigation but do not file a criminal information or obtain an arrest warrant until fifty-two (52) days after the crime occurred. The defendant's attorney files a motion to dismiss, arguing the prosecution is barred by the statute of limitations.\n\nHow must the court rule on the motion?",
    options: {
      A: "A) Deny the motion; felonies carry no statute of limitations under the Mayflower Criminal Justice Act.",
      B: "B) Grant the motion; any felony involving the use, attempted use, or threatened use of physical force must be commenced within fifty (50) days.",
      C: "C) Deny the motion, because the statute of limitations is extended to sixty (60) days if a firearm was utilized.",
      D: "D) Grant the motion, but only if the defendant has not been previously arrested."
    },
    correct: "B"
  },
  {
    id: 16,
    title: "Question 16: The Felony Murder Act",
    scenario: "Scenario: A prisoner confined at the Mayflower State Detention Complex executes a plan to escape. During the escape attempt, the prisoner climbs over a perimeter fence. A responding corrections officer chases the prisoner but trips, falls, and suffers a fatal head injury. The State charges the prisoner with First-Degree Murder under the Felony Murder Act.\n\nIs the First-Degree Murder charge legally sustainable on these facts?",
    options: {
      A: "A) No, because the prisoner did not act with premeditated intent or malice to kill the officer.",
      B: "B) Yes; under the Felony Murder Act, an individual is guilty of First-Degree Murder if they cause a death during the commission of 'Escape'.",
      C: "C) No, because the death was an accidental fall and did not involve the use of a weapon.",
      D: "D) Yes, but only if the prisoner was originally incarcerated for a capital felony."
    },
    correct: "B"
  },
  {
    id: 17,
    title: "Question 17: Pretrial Motion Filing Windows",
    scenario: "Scenario: A district judge orders a standard 10-day pretrial period in a civil contract dispute. On the ninth day of the pretrial period (216 hours after commencement), the plaintiff files a Pretrial Motion for Summary Judgment. The defendant objects, claiming the motion was filed too late.\n\nHow must the judge handle the plaintiff's motion?",
    options: {
      A: "A) Hear the motion; pretrial motions can be filed at any time before the jury is empaneled.",
      B: "B) Reject the motion; a party may only file pretrial motions up until forty-eight (48) hours before the end of the pretrial period.",
      C: "C) Hear the motion, but only if the plaintiff pays a late-filing administrative fee to the Clerk.",
      D: "D) Reject the motion, but only if the defendant can demonstrate 'actual prejudice' caused by the delay."
    },
    correct: "B"
  },
  {
    id: 18,
    title: "Question 18: Administrative Tort Claims Prerequisites",
    scenario: "Scenario: A driver's vehicle is totaled when a Mayflower State Police cruiser negligently runs a red light. The driver immediately files a civil lawsuit for money damages directly in the District Court. The State moves to dismiss the action, noting that the driver failed to submit a written claim to the Department of Justice before filing.\n\nWhat must the court do?",
    options: {
      A: "A) Allow the lawsuit to proceed; vehicular accidents are exempt from administrative exhaustion.",
      B: "B) Dismiss the lawsuit; a claimant must first present a tort claim to the DOJ and receive a final written denial before instituting a court action.",
      C: "C) Stay the lawsuit for 14 days to allow the driver to file a retro-active claim with the DOJ.",
      D: "D) Allow the lawsuit, but limit the plaintiff’s potential recovery to a maximum of $10,000."
    },
    correct: "B"
  },
  {
    id: 19,
    title: "Question 19: Mandatory Recusal for Personal Bias",
    scenario: "Scenario: A defendant in a high-profile criminal case files a timely, sufficient affidavit with supporting evidence showing that the presiding district judge has a documented personal animus against the defendant's family. The judge reviews the affidavit, acknowledges the bias, but enters an order denying recusal, stating: 'I can set my feelings aside and remain fair.'\n\nDid the judge act in accordance with Mayflower judicial law?",
    options: {
      A: "A) Yes; district judges possess absolute, unreviewable discretion to determine their own impartiality.",
      B: "B) No; once a party files a timely and sufficient affidavit asserting personal bias with good cause, the judge is legally mandated to cease all proceedings.",
      C: "C) Yes, but only if the Chief Judge of the county counter-signed the recusal denial.",
      D: "D) No, because judicial bias automatically converts a misdemeanor charge into a felony dismissal."
    },
    correct: "B"
  },
  {
    id: 20,
    title: "Question 20: Command Rank Separation of Powers",
    scenario: "Scenario: The Sheriff of Clark County (an elected principal office) is appointed by the Governor to simultaneously serve as the Chief of the Mayflower State Police (a primary cabinet-level department). The Attorney General reviews the dual appointment and issues an order suspending the official's state police employment, citing a violation of the Public Servants Act.\n\nIs the Attorney General's suspension order legally valid?",
    options: {
      A: "A) Yes; no person may hold a primary command position while serving as an elected official under any circumstances.",
      B: "B) No; the State Code explicitly exempts County Sheriffs from the prohibition against holding a command position while serving as an elected official.",
      C: "C) Yes, because State Senators are the only elected officials permitted to hold cabinet positions.",
      D: "D) No, because the Governor’s appointment powers override all statutory command restrictions."
    },
    correct: "B"
  },
  {
    id: 21,
    title: "Question 21: Non-Competitive Hiring Rounds",
    scenario: "Scenario: A municipal fire department initiates a hiring round. The department's public posting does not specify or limit the number of open slots available. An applicant successfully passes the physical test, the written exam, and the background check. However, the Fire Chief denies the application, stating: 'We decided we already have enough personnel for this cycle.'\n\nIs the Fire Chief's denial of the applicant legally valid?",
    options: {
      A: "A) Yes; department heads possess absolute discretion to reject any applicant at any stage of hiring.",
      B: "B) No; because this was a non-competitive hiring round, any applicant who passes all preceding stages must be accepted, provided it does not exceed the department's budget.",
      C: "C) Yes, but only if the Chief registers a written 'budget deficit' exception with the Department of State.",
      D: "D) No, because fire departments are classified as primary agencies and must hire all applicants who apply."
    },
    correct: "B"
  },
  {
    id: 22,
    title: "Question 22: Statutory Anti-Retaliation Protections",
    scenario: "Scenario: A technician within the Department of Transportation discovers that a supervisor is fraudulently directing state-funded concrete contracts to a private company owned by their spouse. The technician files a formal report with the Department of Justice. Upon learning of the report, the supervisor immediately fires the technician.\n\nWhat crime has the supervisor committed under the Mayflower State Code?",
    options: {
      A: "A) Theft of Public Funds (1 M.S.C. § 1108).",
      B: "B) Misconduct (1 M.S.C. § 1304).",
      C: "C) Gross Misconduct (1 M.S.C. § 1303).",
      D: "D) No crime; the supervisor's actions are treated strictly as an administrative employment dispute."
    },
    correct: "C"
  },
  {
    id: 23,
    title: "Question 23: Restricted Aviation Airspace Borders",
    scenario: "Scenario: A licensed civilian pilot-in-command is operating a helicopter within the City of Lander. The pilot hovers the helicopter at an altitude of 350 studs directly above the International Commerce Center Towers (the city's two tallest buildings) to record video. A Port Authority police officer issues a felony citation.\n\nIs the citation legally valid?",
    options: {
      A: "A) Yes; civilian pilots are strictly prohibited from operating an aircraft within 500 studs of the airspace above the International Commerce Center Towers.",
      B: "B) No, because airspace restrictions only apply below 200 studs.",
      C: "C) Yes, but only if the pilot was operating a commercial aircraft.",
      D: "D) No; the airspace above Lander is entirely open to any pilot holding an active state aviation license."
    },
    correct: "A"
  },
  {
    id: 24,
    title: "Question 24: Illegal Timber Commercialization",
    scenario: "Scenario: A property owner cuts down several Amaranth trees on their private land. Because they do not possess a logging permit, they load the timber into a truck and sell it to a commercial construction contractor for $15,000. A conservation officer discovers the sale and arrests the owner.\n\nWhat is the legal classification of the property owner's offense?",
    options: {
      A: "A) Misdemeanor; carrying a standard fine of $1,200.",
      B: "B) Infraction; carrying a standard civil citation of $500.",
      C: "C) Felony; because putting illegally obtained wood or wood byproducts up for commercial sale is a felony.",
      D: "D) None; private landowners have an absolute right to harvest and sell timber on their own property."
    },
    correct: "C"
  },
  {
    id: 25,
    title: "Question 25: Ballot Audits and Margins of Victory",
    scenario: "Scenario: The Mayflower Electoral Commission publishes the results of a senatorial election. Candidate A wins the election with 51% of the ballots, while Candidate B receives 49% of the ballots. Candidate B demands a formal audit of the ballots, but Candidate A objects, claiming a recount is unnecessary because a clear majority was reached.\n\nHow must the Chief Elections Officer proceed?",
    options: {
      A: "A) Deny the audit; Candidate A’s victory is final upon the certification of the results.",
      B: "B) Begin a formal audit; an audit is statutorily mandated in any election where the margin of victory is less than five percent.",
      C: "C) Order a run-off election immediately, bypassing the audit process.",
      D: "D) Refer the matter to the Supreme Court to determine if 'actual fraud' has been shown."
    },
    correct: "B"
  }
];

function startDmExamSession(user, robloxUser) {
  const session = {
    userId: user.id,
    type: 'EXAM',
    robloxUser: robloxUser,
    discordUser: user.tag || user.username,
    currentQuestion: 0,
    answers: {},
    startTime: Date.now()
  };
  dmSessions.set(user.id, session);
  return session;
}

function startDmTransferSession(user, robloxUser, stateFrom, evidence) {
  const session = {
    userId: user.id,
    type: 'TRANSFER',
    robloxUser: robloxUser,
    discordUser: user.tag || user.username,
    stateFrom: stateFrom,
    evidence: evidence,
    startTime: Date.now()
  };
  dmSessions.set(user.id, session);
  return session;
}

async function sendNextDmExamQuestion(user, interaction) {
  const session = dmSessions.get(user.id);
  if (!session) return;

  const qIndex = session.currentQuestion;
  if (qIndex >= examQuestionsData.length) {
    // Exam Complete -> Auto-Grade & Submit
    await finalizeDmExam(user, session, interaction);
    return;
  }

  const q = examQuestionsData[qIndex];

  const embed = new EmbedBuilder()
    .setTitle(`State Bar Examination — Question ${qIndex + 1} of 25`)
    .setDescription(`**${q.title}**\n\n${q.scenario}`)
    .setColor('#6B21A8')
    .addFields(
      { name: 'Option A', value: q.options.A, inline: false },
      { name: 'Option B', value: q.options.B, inline: false },
      { name: 'Option C', value: q.options.C, inline: false },
      { name: 'Option D', value: q.options.D, inline: false }
    )
    .setFooter({ text: `Candidate: ${session.robloxUser} (@${session.discordUser}) • Question ${qIndex + 1}/25` });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`dm_exam_ans_${qIndex}_A`).setLabel('A').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`dm_exam_ans_${qIndex}_B`).setLabel('B').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`dm_exam_ans_${qIndex}_C`).setLabel('C').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`dm_exam_ans_${qIndex}_D`).setLabel('D').setStyle(ButtonStyle.Primary)
  );

  try {
    await user.send({ embeds: [embed], components: [row] });
  } catch (err) {
    console.warn(`[DM Send Error]: Could not send DM to user ${user.tag}`);
  }
}

async function handleDmExamAnswer(interaction, qIndex, selectedChoice) {
  const user = interaction.user;
  const session = dmSessions.get(user.id);
  if (!session) {
    await interaction.reply({ content: 'Session expired or not found. Please click "Take Exam via DMs" to start.', ephemeral: true });
    return;
  }

  session.answers[qIndex + 1] = selectedChoice;
  session.currentQuestion++;

  await interaction.update({
    content: `Selected **[ ${selectedChoice} ]** for Question ${qIndex + 1}.`,
    embeds: [],
    components: []
  });

  await sendNextDmExamQuestion(user, interaction);
}

async function finalizeDmExam(user, session, interaction) {
  let score = 0;
  let breakdown = [];

  examQuestionsData.forEach(q => {
    const userAns = session.answers[q.id];
    if (userAns === q.correct) {
      score++;
      breakdown.push(`Q${q.id}: Correct (${q.correct})`);
    } else {
      breakdown.push(`Q${q.id}: Incorrect (Selected ${userAns || 'None'}, Correct: ${q.correct})`);
    }
  });

  const total = examQuestionsData.length;
  const percentage = Math.round((score / total) * 100);
  const passed = percentage >= 70;

  // Create Application Record for Executive Board Review
  const filingId = `exam_${Date.now()}`;
  const examRecord = {
    id: Date.now(),
    type: "Bar Exam Result",
    robloxUser: session.robloxUser,
    discordUser: session.discordUser,
    stateFrom: `Bar Exam Score: ${score}/${total} (${percentage}%) - ${passed ? 'PASSED' : 'FAILED'}`,
    evidence: `Official 25-Question DM Examination. Result: ${score}/${total} (${percentage}%). Details: ${breakdown.join(' | ')}`,
    status: "Pending Review",
    date: new Date().toLocaleDateString(),
    applicant: user
  };

  addApplication(examRecord);

  // Send to Executive Board Review Channel (1538067231236161616)
  if (interaction && interaction.client) {
    const stateBarReviewChannelId = config.stateBarReviewChannelId || '1539848757967986708';
    const clerkChannel = await interaction.client.channels.fetch(stateBarReviewChannelId).catch(() => null);

    if (clerkChannel && clerkChannel.isTextBased()) {
      const clerkEmbed = new EmbedBuilder()
        .setAuthor({ name: 'State Bar of Mayflower', iconURL: clerkChannel.guild ? clerkChannel.guild.iconURL() : undefined })
        .setTitle('State Bar Examination Result (DM Submission)')
        .setColor('#6B21A8')
        .addFields(
          { name: 'Roblox Username', value: session.robloxUser, inline: true },
          { name: 'Discord Handle', value: `@${session.discordUser}`, inline: true },
          { name: 'Exam Score', value: `${score}/${total} (${percentage}%) - ${passed ? 'PASSED' : 'FAILED'}`, inline: true },
          { name: 'Detailed Breakdown', value: `Completed via DM Interactive Testing Environment.\n${score}/${total} Statutory Answers Correct.`, inline: false }
        )
        .setFooter({ text: 'Submitted via State Bar DM Exam Environment' });

      const actionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`clerk_approve_${filingId}`).setLabel('Approve Admission').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`clerk_deny_${filingId}`).setLabel('Deny Admission').setStyle(ButtonStyle.Danger)
      );

      await clerkChannel.send({ embeds: [clerkEmbed], components: [actionRow] });
    }
  }

  // Send Simple Completion Confirmation to Candidate (Hiding exact score)
  try {
    await user.send({
      embeds: [
        new EmbedBuilder()
          .setTitle('State Bar Examination Paper Logged')
          .setDescription(`SUCCESS: State Bar Examination paper for candidate "**${session.robloxUser}**" has been submitted.\n\nYour paper has been logged into the Central Database for Executive Review.`)
          .setColor('#2E7D32')
      ]
    });
  } catch (e) {}

  dmSessions.delete(user.id);
}

module.exports = {
  startDmExamSession,
  startDmTransferSession,
  sendNextDmExamQuestion,
  handleDmExamAnswer,
  finalizeDmExam,
  dmSessions
};
