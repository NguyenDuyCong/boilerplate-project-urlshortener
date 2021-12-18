// Update code by NDC

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const validUrl = require("valid-url");

const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use("/public", express.static(`${process.cwd()}/public`));

app.get("/", function (req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

// Your first API endpoint
app.get("/api/hello", function (req, res) {
  res.json({ greeting: "hello API" });
});

// body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // for form data

// mongoDb connection
mongoose.connect(process.env.MONGO_URI);
const ShortUrlModel = mongoose.model(
  "ShortUrl",
  new mongoose.Schema({
    original_url: {
      type: String,
      required: true,
      unique: true
    },
    short_url: {
      type: Number,
      required: true
    }
  })
);

const findLastRecord = (done) => {
  ShortUrlModel.find()
    .sort({ short_url: -1 })
    .limit(1)
    .exec((err, data) => {
      if (err) return console.error(err);
      done(null, data);
    });
};

const findByUrl = async (original_url) => {
  const data = await ShortUrlModel.find({ original_url: original_url })
    .then((r) => r)
    .catch((err) => console.error(err));
  return data[0];
};

app.post("/api/shorturl", async (req, res, next) => {
  let original_url = req.body.url;

  // check valid url
  var expression =
    /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;
  var regex = new RegExp(expression);
  if (!original_url.match(regex)) {
    return res.json({ error: "invalid url" });
  }

  let newShortUrl = {
    original_url: original_url,
    short_url: 0
  };

  let dataRecored = await findByUrl(original_url)
    .then((r) => r)
    .catch((err) => next(err));
  console.log(dataRecored);

  if (dataRecored) {
    newShortUrl.short_url = dataRecored.short_url;
    return res.json(newShortUrl);
  }

  findLastRecord((err, data) => {
    if (err) return next(err);
    if (!data) {
      console.log("Missing `done()` argument");
      next({ message: "Missing callback argument" });
    }
    // console.log(data);
    if (data.length === 0) {
      ShortUrlModel.create([newShortUrl], (err, _short_url) => {
        if (err) return next(err);
        res.json(newShortUrl);
      });
    } else {
      newShortUrl.short_url = data[0].short_url + 1;
      ShortUrlModel.create([newShortUrl], (err, _short_url) => {
        if (err) return next(err);
        res.json(newShortUrl);
      });
    }
  });
});

// get request to short url
app.get("/api/shorturl/:num", async (req, res, next) => {
  let num = Number(req.params.num);
  let dataRecorded = await ShortUrlModel.find({ short_url: num })
    .then((d) => d[0])
    .catch((err) => console.log(err));
  if (dataRecorded) {
    return res.redirect(dataRecorded.original_url);
  } else {
    return res.status(404).send("Not Found!!!");
  }
});

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
