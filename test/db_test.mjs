// @format
import test from "ava";
import { access, unlink } from "fs/promises";
import { constants } from "fs";
import { fileURLToPath } from "url";
import path from "path";

import { init, questions, stills, migrations } from "../src/db.mjs";
import config from "../config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const database = {
  name: "test.db"
};

async function delDB() {
  try {
    await access(database.name, constants.F_OK);
  } catch (err) {
    return;
  }
  console.info("deleting test.db");
  await unlink(path.resolve(__dirname, `../${database.name}`));
}

test.afterEach.always(delDB);
test.before(delDB);

test.serial("if init migration runs a migration on the db", async t => {
  migrations.init(0);
  const db = init();
  const [token, priority] = db.prepare("PRAGMA table_info(stills)").all();
  t.is(priority.name, "priority");
  t.is(token.name, "token");
});

test.serial("if stills can be generated with tokens in db", async t => {
  migrations.init(0);
  await stills.init();

  const db = init();
  const { actual } = db.prepare("SELECT COUNT(*) as actual FROM stills").get();
  t.is(config.stills.quantity, actual);
});

test.serial(
  "if questions can be configured in db according to .mjs file",
  async t => {
    migrations.init(0);
    migrations.init(1);
    await stills.init();
    await questions.init();

    const db = init();
    const { boxAmount } = db
      .prepare("SELECT COUNT(*) as boxAmount FROM boxes")
      .get();
    t.true(boxAmount > 0);
    t.truthy(boxAmount);

    const { optionAmount } = db
      .prepare("SELECT COUNT(*) as optionAmount FROM options")
      .get();
    t.true(optionAmount > 0);
    t.truthy(optionAmount);

    const ksuids = db.prepare("SELECT ksuid FROM boxes ORDER BY ksuid").all();
    const copy = [...ksuids].sort((a, b) => a.ksuid - b.ksuid);
    t.deepEqual(ksuids, copy);
  }
);

test.serial("if migration 1 can be applied", async t => {
  migrations.init(0);
  migrations.init(1);
  const db = init();

  db.prepare(
    `
    INSERT INTO
      boxes(ksuid, title, content)
    VALUES
      ('box1', 'title', 'content')
  `
  ).run();

  db.prepare(
    `
    INSERT INTO
      options(ksuid, content, boxID)
    VALUES
      ('option1', 'option1', 'box1')
  `
  ).run();

  db.prepare(
    `
    INSERT INTO
      options(ksuid, content, boxID)
    VALUES
      ('option2', 'option2', 'box1')
  `
  ).run();

  db.prepare(
    `
    INSERT INTO
      stills(token, priority, email)
    VALUES
      ('a', 0, 'tim@example.com')
  `
  ).run();

  db.prepare(
    `
    INSERT INTO
      stills(token, priority, email)
    VALUES
      ('b', 1, 'tim@example.com')
  `
  ).run();

  db.prepare(
    `
    INSERT INTO
      stills(token, priority, email)
    VALUES
      ('c', 2, 'alice@example.com')
  `
  ).run();

  db.prepare(
    `
    INSERT INTO
      votes(optionID, token)
    VALUES
      ('option2', 'a')
  `
  ).run();

  db.prepare(
    `
    INSERT INTO
      votes(optionID, token)
    VALUES
      ('option1', 'b')
  `
  ).run();

  db.prepare(
    `
    INSERT INTO
      votes(optionID, token)
    VALUES
      ('option1', 'c')
  `
  ).run();

  const result = db
    .prepare(
      `
    SELECT
      stills.email,
      votes.optionID,
      stills.priority
    FROM
      options
    JOIN
      boxes
    ON
      boxes.ksuid = options.boxID
    JOIN
      votes
    ON
      votes.optionId = options.ksuid
    JOIN
      stills
    ON
      stills.token = votes.token
    WHERE
      boxes.ksuid = 'box1'
    GROUP BY
      stills.email,
      votes.optionID
  `
    )
    .all();
  t.deepEqual(result, [
    {
      email: "alice@example.com",
      optionID: "option1",
      priority: 2
    },
    {
      email: "tim@example.com",
      optionID: "option1",
      priority: 1
    },
    {
      email: "tim@example.com",
      optionID: "option2",
      priority: 0
    }
  ]);
});