// Bilinen geçici/anonim mail servis domainleri — kayıt engellidir.
// Kaynak: popüler blocklist'ler + manual ekleme
const BLOCKED_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', 'guerrillamail.info', 'guerrillamail.net',
  'guerrillamail.org', 'guerrillamail.de', 'guerrillamailblock.com', 'grr.la',
  'sharklasers.com', 'spam4.me', 'trashmail.com', 'trashmail.me', 'trashmail.net',
  'trashmail.at', 'trashmail.io', 'trashmail.org', 'yopmail.com', 'yopmail.fr',
  'cool.fr.nf', 'jetable.fr.nf', 'nospam.ze.tc', 'nomail.xl.cx', 'mega.zik.dj',
  'speed.1s.fr', 'courriel.fr.nf', 'moncourrier.fr.nf', 'monemail.fr.nf',
  'monmail.fr.nf', 'maildrop.cc', 'tempinbox.com', 'getonemail.net',
  'spamgourmet.com', 'spamgourmet.net', 'spamgourmet.org', 'mintemail.com',
  'dispostable.com', 'tempr.email', 'discard.email', 'spamfree24.org',
  'mailnull.com', 'spamobox.com', 'incognitomail.org', 'pookmail.com',
  'bobmail.info', 'letthemeatspam.com', 'fast-email.com', 'spamhero.com',
  'mailmetrash.com', 'fakemailgenerator.com', 'getnada.com', 'mailnesia.com',
  '10minutemail.com', '10minutemail.net', '10minutemail.org', '10minutemail.de',
  '20minutemail.com', 'throwam.com', 'spambox.us', 'wegwerfmail.de',
  'wegwerfmail.net', 'wegwerfmail.org', 'sogetthis.com', 'uroid.com',
  'netmails.net', 'spamherelots.com', 'mail-temporaire.com', 'jetable.org',
  'jetable.net', 'nospamfor.us', 'kurzepost.de', 'objectmail.com',
  'rego.ua', 'spamfree.eu', 'filzmail.com', 'throwam.com', 'getairmail.com',
  'mailexpire.com', 'spamoff.de', 'rklips.com', 'bumpymail.com',
  'tempemail.net', 'throwam.com', 'mailnull.com', 'spamgourmet.net',
  'mt2009.com', 'mt2014.com', 'yopmail.net', 'tempmail.com', 'tempmail.net',
  'temp-mail.org', 'temp-mail.ru', 'tempmail.org', 'tmails.net', 'tmpmail.net',
  'tmpmail.org', 'mailtemp.info', 'throwaway.email', 'throwam.com',
  'fakeinbox.com', 'tempsky.com', 'mailnew.com', 'mailseal.de',
  'mohmal.com', 'mailbucket.org', 'mailscrap.com', 'mailslapping.com',
  'opentrash.com', 'owlpic.com', 'pecinan.com', 'rantapigo.com',
  'rax.la', 'regbypass.com', 'safetypost.de', 'spam.la', 'spamfree24.info',
  'spamgob.com', 'spamhereplease.com', 'spamhole.com', 'spamify.com',
  'spamkill.info', 'spaml.com', 'spamtrail.com', 'ssoia.com',
  'tempalias.com', 'temporaryinbox.com', 'thisisnotmyrealemail.com',
  'trashdevil.com', 'trashdevil.de', 'trbvm.com', 'turual.com',
  'tyldd.com', 'uggsrock.com', 'venompen.com', 'veryrealemail.com',
  'viditag.com', 'viewcastmedia.com', 'viewcastmedia.net', 'wegwerfadresse.de',
  'wetrainbayarea.com', 'willhackforfood.biz', 'willselfdestruct.com',
  'wuzup.net', 'xagloo.com', 'xemaps.com', 'xents.com', 'xmaily.com',
  'xoxy.net', 'yapped.net', 'zetmail.com', 'zipmail.in', 'zippymail.info',
]);

const isDisposableEmail = (email: string): boolean => {
  const domain = email.trim().toLowerCase().split('@')[1] || '';
  return BLOCKED_DOMAINS.has(domain);
};

module.exports = { isDisposableEmail };
export {};
