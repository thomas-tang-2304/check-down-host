import { configEnv } from "./configEnv.js";
import { OAuth2Client } from "google-auth-library";
import nodemailer from "nodemailer";
configEnv();

import { writeFileSync, writeFile } from "fs";

// Khởi tạo OAuth2Client với Client ID và Client Secret
const myOAuth2Client = new OAuth2Client(
  process.env.GOOGLE_MAILER_CLIENT_ID,
  process.env.GOOGLE_MAILER_CLIENT_SECRET
);
// Set Refresh Token vào OAuth2Client Credentials
myOAuth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_MAILER_REFRESH_TOKEN,
});

const fetchIP = (url, hostIP, current_status, email) =>
  fetch(url)
    .then(async (response) => {
      if (!response.ok) {
        console.log(response.status);
        throw new Error(false);
      } else {
        return response;
      }
    })
    .then((data) => {
      if (current_status == false) {
        list_domain[count].email.forEach(async (emailAdd) => {
          await sendEmail({
            email: emailAdd,
            hostIP,
            status: true,
            url,
            body: `is working`,
          });
        });
      }
      return {
        status: true,
      };
    })
    .catch(async (error) => {
      console.error("Error fetching IP information:", error);
      if (current_status == true) {
        email.forEach(async (emailAdd) => {
          await sendEmail({
            email: emailAdd,
            hostIP,
            status: false,
            url,
            body: `was downed`,
          });
        });
        // console.log("Gửi mail web DOWN");
      }
      return {
        status: false,
      };
    });

// Function to simulate sending an email (replace this with your actual email sending logic)
async function sendEmail(req) {
  const { email, status, hostIP, url, body } = req;
  try {
    // Lấy thông tin gửi lên từ client qua body
    console.log({ email, status, hostIP, url, body });
    if (
      !email ||
      status == null ||
      status == undefined ||
      !hostIP ||
      !url ||
      !body
    )
      throw new Error("Please provide email, host IP and code status!");
    const htmlResult = status;

    const myAccessTokenObject = await myOAuth2Client.getAccessToken();

    // Access Token sẽ nằm trong property 'token' trong Object mà chúng ta vừa get được ở trên
    const myAccessToken = myAccessTokenObject?.token;

    // Tạo một biến Transport từ Nodemailer với đầy đủ cấu hình, dùng để gọi hành động gửi mail
    const transport = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: process.env.ADMIN_EMAIL_ADDRESS,
        clientId: process.env.GOOGLE_MAILER_CLIENT_ID,
        clientSecret: process.env.GOOGLE_MAILER_CLIENT_SECRET,
        refresh_token: process.env.GOOGLE_MAILER_REFRESH_TOKEN,
        accessToken: myAccessToken,
      },
    });

    const mailOptions = {
      to: email, // Gửi đến ai?
      subject: `${hostIP} - ${url} - ${body}`, // Tiêu đề email
    };

    // Gọi hành động gửi email
    await transport.sendMail(mailOptions);

    // Không có lỗi gì thì trả về success
    console.log({
      message: "Email sent successfully.",
    });
  } catch (error) {
    // const mailOptions = {
    //   to: email, // Gửi đến ai?
    //   subject: "Kết quả trả về từ tên miền crawl.khangtrieu.com", // Tiêu đề email
    //   html: JSON.stringify({ errors: error.message }).replace(
    //     /\[object Object\]/g,
    //     ""
    //   ), // Nội dung email
    // };

    // await transport.sendMail(mailOptions);
    console.log({ errors: error.message });
  }
}
import list_domain_json from "./list_domain.json" assert { type: "json" };
import list_domain_checked_json from "./list_domain_checked.json" assert { type: "json" };

let list_domain = list_domain_json.map((domain) => ({
  ...domain,
  url: domain.url.trim(),
}));
let list_domain_checked = list_domain_checked_json.map((domain) => ({
  ...domain,
  url: domain.url.trim(),
}));

async function cycleArray() {
  let count = 0;
  while (count < list_domain.length) {
    let list_domain_checked_index = list_domain_checked.findIndex(
      (domain) => domain.url == list_domain[count]?.url.trim()
    );

    const current_status = (
      await fetchIP(
        list_domain[count]?.url.trim(),
        list_domain[count]?.hostIP,
        list_domain_checked[list_domain_checked_index]?.status,
        list_domain[count]?.email
      )
    ).status;
    console.log(
      "Last Status:",
      list_domain_checked[list_domain_checked_index]?.status
    );
    if (
      list_domain_checked.filter(
        (domain) => domain.url == list_domain[count].url.trim()
      ).length > 0 &&
      list_domain_checked[list_domain_checked_index]
    ) {
      list_domain_checked[list_domain_checked_index].status = current_status;
    } else {
      list_domain_checked.push({
        url: list_domain[count].url.trim(),
        hostIP: list_domain[count].hostIP,
        status: current_status,
      });
    }
    console.log("Job Status:", current_status);
    console.log(list_domain[count].url.trim());
    await writeFile(
      "list_domain_checked.json",
      JSON.stringify(list_domain_checked),
      "utf-8",
      () => {
        console.log("Finished");
      }
    );

    console.log("--------------------------------------------");

    // increment our counter
    count++;

    // // reset counter if we reach end of array
    // if (count === list_domain.length) {
    //   count = 0;
    // }
  }
}
const delay = (delayInms) => {
  return new Promise((resolve) => setTimeout(resolve, delayInms));
};

import express from "express";
const app = express();
const port = 8080;
app.get("/", (req, res) => {
  res.send("Hello World!");
});
app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});

import schedule from "node-schedule";

schedule.scheduleJob("*/3 * * * *", function () {
  const date = new Date();
  console.log(date);
  (async () => {
    await cycleArray();
  })();
});
