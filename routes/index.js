const axios = require("axios");
const express = require("express");
const router = express.Router();
const multer = require("multer");
const { open, unlink } = require("node:fs/promises");

const sleep = (ms = 1000) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const upload = multer({ dest: "./uploads/" });

/* GET home page. */
router.get("/", function (req, res, next) {
  res.render("index", { title: "Express" });
});

/**
 * @route POST /
 * @group ShortURL
 * @consumes multipart/form-data
 * @param {string} access_token.formData.required
 *  - picsee.io api token eg: 1ee14f8b6e5d82a6da9b94b7b86ac75fa915f612
 * @param {file} source.formData.required - pembahasan
 *  - txt 範例 eg: user : wallet500/n https://gci-web.g20-prod.com/h5/index.html?param=IVeHhC5eyJnYW1lVHlwZSI6bnVsbCwiZXhnYW1lIjoidHJ1ZSIsImFnZW50IjoiZTAwMldhbGxldCIsImluQXBwIjpudWxsLCJwcm9jZWR1cmVfaWQiOm51bGwsImNoYW5uZWwiOiJiaW5nb1BsdXMiLCJkbSI6Imh0dHA6Ly8xMC4xLjcuMzk6ODAzMSIsInBpZCI6IjAwMiIsImRlbW8iOm51bGwsImdhbWVsZXZlbCI6bnVsbCwidG9wQ2RuVXJscyI6bnVsbCwicGFzc3dvcmQiOiIwMTU4ZTJkZTIwMWQ0NzJjZTAwOTRmZTQ0NmMzNzgyMSIsImxhbmciOiJQSCIsInZpcCI6bnVsbCwid2ViQXBwIjpudWxsLCJ6aGlibyI6InRydWUiLCJkZWZhdWx0U3R5bGUiOm51bGwsImNkblVybCI6bnVsbCwic2Vzc2lvbl9pZCI6bnVsbCwidmlkZW9JRCI6IlJCMDEiLCJ0cmFjZVVVSUQiOiJmODA3MWM3Zi0yZTIyLTRkMjQtYWQ3MC1lYThlNzBjMGU2MjIiLCJleHB0aW1lc3RhbXAiOjE3MjUwMTg0MzczMTAsInJvb21pZCI6bnVsbCwidG9rZW4iOm51bGwsInRvcFByb3h5TGluZXMiOm51bGwsInN6dSI6ImFhIiwic2l0ZSI6Img1IiwiemhpYm9lZ2FtZSI6InRydWUiLCJyZWRpcmVjdF91cmwiOiJodHRwOi8vZzIwLXBsYXRmb3JtLWRlbW8udHJldmktZGV2LmNjLyIsInVzZXJuYW1lIjoid2FsbGV0NTAwIn0bX5SfIs
 * @returns {object} 200 - Success
 * @returns {object} 400 - Error
 * @returns {object} 500 - picsee 容量不足
 */
router.post("/", upload.single("source"), async function (req, res, next) {
  const { file } = req;
  const filePath = `${file.destination}${file.filename}`;
  const fileSource = await open(filePath);

  try {
    const resultArray = [];
    let tempArray = [];
    for await (const line of fileSource.readLines()) {
      tempArray.push(line);
      if (line.match(/https:\/\//)) {
        resultArray.push(tempArray);
        tempArray = [];
      }
    }

    const planData = await axios.get(
      `https://api.pics.ee/v2/my/api/status?access_token=${req.body.access_token}`
    );
    const {usage, quota} = planData.data.data;
    
    const quotaAmount = quota - usage;
    if (quotaAmount < resultArray.length) {
      throw new Error(`容量已不足, 僅剩 ${quotaAmount} 可使用`);
    }

    const targetResult = [];
    for (let index = 0; index < resultArray.length; index++) {
      await sleep(1000);

      const source = resultArray[index];
      const httpsIndex = source.findIndex(str => str.match(/https:\/\//))
      const url = source[httpsIndex];
      const result = await axios.post(
        `https://api.pics.ee/v1/links?access_token=${req.body.access_token}`,
        { url }
      );
      const { picseeUrl } = result.data.data;
      targetResult.push([...source, picseeUrl]);
      await sleep(1000);
    }

    const fileContent = targetResult
      .map((arr) => `${arr[0]}\n${arr[1]}\n${arr[2]}\n`)
      .join("");
    res.setHeader("content-type", "text/plain");
    res.send(fileContent);
  } catch (error) {
    res.json({ message: error.message });
  } finally {
    await fileSource.close();
    await unlink(filePath);
  }
});

module.exports = router;
