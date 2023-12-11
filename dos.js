const { configEnv } = require("./configEnv");
const { OAuth2Client } = require("google-auth-library");
const nodemailer = require("nodemailer");
configEnv();

const { writeFileSync } = require("fs");
let count = 0;

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
        // Status code is not 200 (e.g., 404, 500, etc.)
        // Simulating sending an email here (replace this with your email sending logic)
        email.forEach(async (emailAdd) => {
          await sendEmail({
            email: emailAdd,
            hostIP,
            status: "Not ok",
            url,
            body: `was downed`,
          });
        });
      } else {
        // await sendEmail({
        //   email: "hongtang240@gmail.com",
        //   status: "ok",
        // });
        return response;
      }
    })
    .then((data) => {
      //   if (data) {
      //     console.log("IP address:", data.ip);
      //     console.log(
      //       "Location:",
      //       data.city + ", " + data.region + ", " + data.country
      //     );
      //     console.log("ISP:", data.org);
      //     console.log("Hostname:", data.hostname);
      //     // You can access more details available in the 'data' object
      //   }
      //   console.log(data);
      return {
        status: "ok",
      };
    })
    .catch(async (error) => {
      console.error("Error fetching IP information:", error);
      if (current_status == "ok" || !current_status) {
        email.forEach(async (emailAdd) => {
          await sendEmail({
            email: emailAdd,
            hostIP,
            status: "Not ok",
            url,
            body: `was downed`,
          });
        });
      }
      return {
        status: "Not ok",
      };
    });

// Function to simulate sending an email (replace this with your actual email sending logic)
async function sendEmail(req) {
  const { email, status, hostIP, url, body } = req;
  try {
    // Lấy thông tin gửi lên từ client qua body
    console.log({ email, status, hostIP });
    if (!email || !status || !hostIP || !url)
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

let list_domain = require("./list_domain.json").map((domain) => ({
  ...domain,
  url: domain.url.trim(),
}));
async function cycleArray() {
  const current_status = (
    await fetchIP(
      list_domain[count].url.trim(),
      list_domain[count].hostIP,
      list_domain[count].status,
      list_domain[count].email
    )
  ).status;
  if (
    (current_status != list_domain[count].status && current_status == "ok") ||
    !list_domain[count].status
  ) {
    list_domain[count].email.forEach(async (emailAdd) => {
      await sendEmail({
        email: emailAdd,
        hostIP: list_domain[count].hostIP,
        status: "ok",
        url: list_domain[count].url.trim(),
        body: `is working`,
      });
    });
  }
  list_domain[count].status = current_status;
  console.log("Job Status:", list_domain[count].status);
  console.log(list_domain[count].url.trim());
  list_domain = [...list_domain];
  writeFileSync("list_domain.json", JSON.stringify(list_domain), "utf-8");

  // increment our counter
  count++;

  // reset counter if we reach end of array
  if (count === list_domain.length) {
    count = 0;
  }
}

setInterval(() => {
  cycleArray();
}, 0.5 * 60 * 1000);
