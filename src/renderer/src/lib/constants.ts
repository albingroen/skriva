export const EXAMPLE_MARKDOWN = `# Mail

Generell dump för saker som kan vara bra att veta i relation till mail-utveckling

## Setup

Mailet byggs med django-templates och sass.
Vi använder [https://github.com/premailer/premailer](Premailer) för att inline:a CSS i templates i runtime.

Alla assets, bilder etc ska peka mot livemiljön, de här urlarna skrivs inte om. Versionera de i mappar så att vi vet vad som är aktuellt. Dessa assets finns i en S3-bucket.

Fonter hostas på AWS S3.

## Testning

Mail kan previewas lokalt på \`http://localhost:8000/internal/mail_preview/?interval=weekly\`,
just nu finns bara stöd för mentions-, och aktiveringsmailet. (Får man inga mentions i flödet kan man justera
antalet dagar som mailet hämtar data för.)

Mailhog körs på \`localhost:8025\`, docker-containern heter \`mailserver\`.

För att skicka mail till mailhog kan man använda management-kommandot:
\`manage.py send_email_preview "vilket.namn.som.helst@allears.ai" -i "weekly"\`

Använd litmus, https://litmus.com/folders/unsorted_emails/emails/6424902/checklist

~På litmus kan man antingen klistra in ett mail för att skapa en preview, använd det som finns under "Plain text" i mailhog när du kopierar, inte "Source".~ Använd inte det här sättet. Det är bäddat för fel och tar tid.

Mailhog kan konfigureras för att skicka mail direkt till litmus. Adressen hittar du i litmus och SMTP-uppgifterna hittar man i 1password.
Det du behöver fylla i är:

\`\`\`
Email address: ( Hittas för aktuellt projekt i Litmus)
SMTP-server: se 1password
SMTP-port: 587
Authentication: PLAIN
Username: se 1password
Password: se 1password
\`\`\`

Glöm inte att bocka i "Save these settings" för att slippa fylla i de igen. ( Bugg i mailhog: Glöm inte boka ur den nästa gång du skickar, annars försöker den spara samma sak igen och failar tyst.)

### Testa på riktigt
Ett bra tips är att sätta upp en windowsdator med outlook och använda den direkt. Det är svårt ibland att förstå i Litmus, det snabbar upp utvecklingen en hel del. Jag satte upp en mailadress \`kommundatorn@outlook.com\` och satte upp den mailen på en iphone, en windowsdator och en android-telefon. Genom att skicka till den här adressen från mailhog kunde man då få ut det till många enheter snabbt.

Det som bör testas är:
- Mail på MacOS
- Mail på iPhone
- GMail på web
- Gmail-appen
- Outlook på windows
- Outlook på web

## Tips & tricks

Mycket tips och tricks om struktur och allmänt bra idéer om hur man löser email-relaterade problem finns på [https://www.cerberusemail.com](Cerberus Email).

Ska du bygga grafer? [Den här sidan (charts.email)](https://charts.email/) är en väldigt bra startpunkt.

### Runda hörn
Runda hörn är fint - Men om man använder outlook-specifik kod så fungerar inte trackingen från vår mail provider.


### Responsivitet

Stödet för responsivitet i mailklienter är extremt begränsat, finns det saker som kräver media-queries i designen så utgå från telefonen / worst case.
Tänk på regler kring CSS-specificitet, https://developer.mozilla.org/en-US/docs/Web/CSS/Specificity. För att undvika att använda \`important!\` på allt,
skriv all CSS som ska overridas i en media-query i <style>-taggen direkt i templaten.

### Saker ser inte ut som de ska

Ser mailet konstigt ut när man vidarebefordrar, kollar hela, eller länkas vissa saker som inte borde vara länkar?
Kika på Cerberus för svar, om de inte finns där så kika i det renderade mailet från klienten felet sker i. De flesta mailklienter
skriver om själva mailet, så man kan leta efter "extra-klasser" som läggs på för att tvinga fram beteenden. Dessa kan (i en del fall) justeras.

### Storlek

Generellt sett, Ju mindre markup, desto mer content kan vi få in i mailet så försök få till strukturer som inte kräver alltför djupa och komplicerade nästlingar.
Tänk också på att all CSS inline:as med alla dess klasser, samt att klassnamnen behålls. Så även här finns vikt att spara om man kan generalisera.

### Mikrostrukturer som vi använder oss av:

Struktur för en "box":

\`\`\`html
<table
  align="center"
  cellpadding="0"
  cellspacing="0"
  role="presentation"
  class="box box--blue"
>
  <tr>
    <td class="content-wrapper" align="center">
      <table cellpadding="0" cellspacing="0" class="content">
        // content
      </table>
    </td>
  </tr>
</table>
\`\`\`
`
