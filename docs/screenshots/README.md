# SBD Screenshot Gallery

Drop the final product screenshots in this folder when ready.

Recommended filenames:

```text
home.png
question.png
thinking.png
guess-reveal.png
wrong-guess.png
win.png
give-up.png
mobile.png
```

Recommended capture guidelines:

- use the production build;
- keep browser chrome cropped out when possible;
- capture at least one desktop and one mobile layout;
- avoid screenshots containing API keys, environment variables, deploy-hook URLs, database connection strings, or private account UI;
- prefer PNG or high-quality WebP;
- keep consistent aspect ratios for the three hero README screenshots.

README gallery target:

| Home / Lock In | Deduction | Suspect Acquired |
|---|---|---|
| `home.png` | `question.png` | `guess-reveal.png` |

Once the images are added, replace the placeholder cells in the root `README.md` with image links such as:

```md
![SBD Home](./docs/screenshots/home.png)
```
