# strike

- Launch: Feb 15, 2022 (postponed by Studio Bonn)

## installation

Clone the repository on your machine and `cd` into the folder.

```bash
apt-get update
sudo apt-get install build-essential
make setup
pm2 start
```

## visual debugging of mjml-designed email templates

- We use [mjml](https://documentation.mjml.io) to format our emails
  responsively.
- The templates can be found in `src/templates`.
- For visual debugging, use the following command line options:

```bash
mjml --watch ./src/templates/signup.mjml --output test.html
```

**NOTE:** `mjml` may have to be installed globally using `npm i -g`.

## api

### exemplary calls using `curl`

```bash
curl \
  -X PATCH \
  --data '{"email":"your@email.com"}' \
  -H "Content-Type: application/json" \
  "http://localhost:5000/stills/"
```
