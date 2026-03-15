// backend/services/jobService.js
const JobListing = require("../models/JobListing");
const JobApplication = require("../models/JobApplication");

const JobService = {
  async createJob(postedBy, data) {
    const job = new JobListing({ ...data, postedBy });
    await job.save();
    return job;
  },

  async applyToJob(applicant, jobId, { coverLetter, resumeUrl }) {
    const existing = await JobApplication.findOne({ applicant, job: jobId });
    if (existing) throw new Error("You already applied for this job");

    const application = new JobApplication({ applicant, job: jobId, coverLetter, resumeUrl });
    await application.save();

    await JobListing.findByIdAndUpdate(jobId, { $inc: { applicantsCount: 1 } });
    return application;
  },

  async shortlistApplication(adminEmail, applicationId, notes) {
    if (adminEmail !== "avastaian36@gmail.com") throw new Error("Unauthorized admin");

    const application = await JobApplication.findByIdAndUpdate(
      applicationId,
      { status: "shortlisted", notes },
      { new: true }
    );
    return application;
  },
};

module.exports = {
  JobService,
};
