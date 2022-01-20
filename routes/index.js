var express = require("express");
var router = express.Router();
const axios = require("axios");
const fs = require("fs");
var html2json = require("html2json").html2json;

router.post("/", async (req, res) => {
  const { url } = req.body;
    try {
      const monthJsonData = await monthData(url || "https://www.accuweather.com/en/gb/london/ec4a-2/april-weather/328328?year=2022");
    
      const dayJsonData = await dayData(monthJsonData);
      dayJsonData.forEach((e, i) => {
        monthJsonData[i].dayDetail = e.data;
      });
      await fs.appendFileSync("./response.json", JSON.stringify(monthJsonData));
      res.send({ msg: "ok" });
    } catch (error) {
      console.log(error);
      res.send({ msg: "error eccourred" });
    }
});

const monthData = async (url) => {
  return new Promise(async (resolve, reject) => {
    axios
      .get(url)
      .then(async (response) => {
        const jsonData = await html2json(
          response.data.slice(
            response.data.indexOf('<div class="monthly-calendar">'),
            response.data.indexOf(
              '<div class="temperature-graph content-module">'
            )
          )
        )
          .child[0].child.filter((item) => item.tag == "a")
          .map((item) => {
            return {
              url: "https://www.accuweather.com" + item.attr.href,
              date: item.child[1].child[1].child[0].text
                .replace(/\n/g, "")
                .replace(/\t/g, ""),
              high: item.child[3].child
                .find(
                  (e) =>
                    e.node == "element" &&
                    e.attr.class != "low" &&
                    e.attr.class != "history"
                )
                .child[0].text.replace("&#xB0;", "")
                .replace(/\n/g, "")
                .replace(/\t/g, ""),
              low: item.child[3].child
                .find((e) => e.node == "element" && e.attr.class == "low")
                .child[0].text.replace("&#xB0;", "")
                .replace(/\n/g, "")
                .replace(/\t/g, ""),
            };
          });
        resolve(jsonData);
      })
      .catch((err) => reject(err));
  });
};

const dayData = async (reqs) => {
  return new Promise(async (resolve, reject) => {
    let requests = [];
    await reqs.forEach((item) => {
      requests.push(axios.get(item.url));
    });
    axios
      .all(requests)
      .then(
        axios.spread((...responses) => {
          return resolve(responses);
        })
      )
      .catch((errors) => {
        return reject(errors);
      });
  });
};

module.exports = router;
