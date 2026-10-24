<template>
  <div class="bio-scroll">
    <!-- Profile header -->
    <div class="bio-header">
      <img class="bio-avatar" src="@/assets/Biography/self.jpeg" alt="Prakaash Chand" />
      <div class="bio-heading">
        <h2 class="bio-name">Prakaash Chand <span class="aka">aka ASTUTE</span></h2>
        <p class="bio-role">Senior Consultant · Offensive Security</p>
        <p class="bio-certs">OSCP+ · CRTP · CRTA · eJPT · CAP · CLLMSE · CLLMSP</p>
        <p class="bio-company">Senior Consultant at Deloitte</p>
      </div>
    </div>

    <!-- About -->
    <section class="bio-section">
      <h3 class="bio-title">About Me</h3>
      <p class="bio-text">
        I am a cybersecurity professional focused on web application penetration testing,
        infrastructure VAPT, Active Directory penetration testing, red team operations,
        phishing simulation, OSINT, digital forensics, and malware analysis. I hold OSCP+,
        CRTP, CRTA, eJPT, CAP, CLLMSE (Certified LLM Security Expert), CLLMSP (Certified LLM
        Security Professional), and Hack The Box Pro Labs Dante certifications. I have been
        recognized by companies including BlackBerry, Nokia, Philips, Trend Micro, Lenovo,
        Samsung, and Cambridge University, helped secure 40+ companies through bug bounty
        programs, worked as a YesWeHack triager, and currently serve as a Senior Consultant
        at Deloitte.
      </p>
    </section>

    <!-- Skills -->
    <section class="bio-section">
      <h3 class="bio-title">Core Skills</h3>
      <div class="skill-grid">
        <div class="skill-card">
          <h4 class="skill-cat">Web &amp; API</h4>
          <p>OWASP Top 10, API security, thick client, source review</p>
        </div>
        <div class="skill-card">
          <h4 class="skill-cat">Infrastructure</h4>
          <p>Network VAPT, cloud security, misconfiguration hunting</p>
        </div>
        <div class="skill-card">
          <h4 class="skill-cat">Active Directory</h4>
          <p>AD attack paths, Kerberos abuse, privilege escalation</p>
        </div>
        <div class="skill-card">
          <h4 class="skill-cat">Red Team</h4>
          <p>Adversary simulation, phishing, lateral movement, C2</p>
        </div>
        <div class="skill-card">
          <h4 class="skill-cat">OSINT &amp; DFIR</h4>
          <p>Open-source intel, digital forensics, malware analysis</p>
        </div>
        <div class="skill-card">
          <h4 class="skill-cat">AI Security</h4>
          <p>LLM security, AI governance, prompt-injection testing</p>
        </div>
      </div>
    </section>

    <!-- Experience -->
    <section class="bio-section">
      <h3 class="bio-title">Experience</h3>
      <div class="exp-item">
        <div class="exp-head">
          <span class="exp-role">Senior Consultant</span>
          <span class="exp-co">Deloitte</span>
        </div>
        <p class="exp-desc">
          Lead VAPT and red team engagements across web, API, mobile, thick client, cloud,
          and Active Directory environments. Deliver client-facing security reports and
          remediation guidance.
        </p>
      </div>
      <div class="exp-item">
        <div class="exp-head">
          <span class="exp-role">Bug Bounty &amp; Recognition</span>
          <span class="exp-co">40+ companies</span>
        </div>
        <p class="exp-desc">
          Recognized by BlackBerry, Nokia, Philips, Trend Micro, Lenovo, Samsung, and
          Cambridge University. Former YesWeHack triager.
        </p>
      </div>
    </section>

    <!-- Contact -->
    <section class="bio-section">
      <h3 class="bio-title">Connect</h3>
      <div class="contact-row">
        <a class="contact-link" href="https://www.linkedin.com/in/prakashchand72/" target="_blank">LinkedIn</a>
        <a class="contact-link" href="https://github.com/prakashchand72" target="_blank">GitHub</a>
        <a class="contact-link" href="https://x.com/prakashchand72" target="_blank">X / Twitter</a>
        <a class="contact-link" href="https://medium.com/@prakashchand72" target="_blank">Medium</a>
        <a class="contact-link" href="https://discord.com/users/astute72" target="_blank">Discord</a>
      </div>
    </section>

    <!-- Resume -->
    <section class="bio-section">
      <h3 class="bio-title">Resume</h3>
      <div class="resume-links">
        <a class="resume-link" href="/files/Prakaash_Chand_Resume.html" target="_blank">View ATS résumé</a>
        <a class="resume-link" href="/files/Prakaash_Chand_Resume.pdf" download>Download PDF</a>
      </div>
    </section>
  </div>
</template>

<style scoped>
.bio-scroll {
  height: 100%;
  overflow-y: auto;
  padding: 18px 20px 24px;
  font-family: 'MS Sans Serif', monospace;
  color: #1a1a1a;
  background: #ffffff;
}

.bio-header {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  padding-bottom: 16px;
  border-bottom: 1px solid #c0c0c0;
}

.bio-avatar {
  width: 96px;
  height: 96px;
  object-fit: cover;
  border: 2px solid #808080;
  box-shadow: 2px 2px 0 #c0c0c0;
  flex-shrink: 0;
}

.bio-heading {
  min-width: 0;
}

.bio-name {
  font-size: 20px;
  font-weight: bold;
  margin: 0 0 4px;
  color: #000080;
}

.aka {
  font-size: 14px;
  color: #808080;
  font-weight: normal;
}

.bio-role {
  font-size: 13px;
  font-weight: bold;
  margin: 0 0 4px;
}

.bio-certs {
  font-size: 12px;
  color: #444;
  margin: 0 0 4px;
}

.bio-company {
  font-size: 12px;
  color: #444;
  margin: 0;
}

.bio-section {
  padding-top: 16px;
}

.bio-title {
  font-size: 14px;
  font-weight: bold;
  color: #000080;
  margin: 0 0 8px;
  padding-bottom: 3px;
  border-bottom: 1px solid #c0c0c0;
}

.bio-text {
  font-size: 13px;
  line-height: 1.5;
  margin: 0;
}

.skill-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 8px;
}

.skill-card {
  border: 1px solid #808080;
  background: #f0f0f0;
  padding: 8px 10px;
  box-shadow: 1px 1px 0 #c0c0c0;
}

.skill-cat {
  font-size: 12px;
  font-weight: bold;
  margin: 0 0 4px;
  color: #000080;
}

.skill-card p {
  font-size: 11px;
  line-height: 1.4;
  margin: 0;
  color: #333;
}

.exp-item {
  margin-bottom: 12px;
}

.exp-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
}

.exp-role {
  font-size: 13px;
  font-weight: bold;
}

.exp-co {
  font-size: 12px;
  color: #000080;
}

.exp-desc {
  font-size: 12px;
  line-height: 1.45;
  margin: 4px 0 0;
  color: #333;
}

.contact-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.contact-link {
  font-size: 12px;
  color: #000080;
  text-decoration: underline;
  padding: 4px 8px;
  border: 1px solid #c0c0c0;
  background: #f0f0f0;
}

.contact-link:hover {
  background: #000080;
  color: #fff;
}

.resume-links {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.resume-link {
  font-size: 12px;
  color: #ff5733;
  text-decoration: underline;
  padding: 4px 8px;
  border: 1px solid #c0c0c0;
  background: #f0f0f0;
}

.resume-link:hover {
  background: #ff5733;
  color: #fff;
}
</style>
