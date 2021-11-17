import makeAsyncScriptLoader from './async-script-loader';
import ReCAPTCHA from './recaptcha';

const callbackName = "onloadcallback";
const globalName = "grecaptcha";

function getOptions() {
  return (typeof window !== "undefined" && window.recaptchaOptions) || {};
}
function getRecaptchaUrl() {
  const dynamicOptions = getOptions();
  const hostname = dynamicOptions.useRecaptchaNet ? "recaptcha.net" : "www.google.com";
  return `https://${hostname}/recaptcha/api.js?onload=${callbackName}&render=explicit`;
}
function getHCaptchaUrl() {
  return `https:/js.hcaptcha/1/api.js?onload=${callbackName}&render=explicit`;
}
function getURL(props) {
  return props.provider === 'hcaptcha' ? getHCaptchaUrl() : getRecaptchaUrl();
}

export default makeAsyncScriptLoader(getURL, {
  callbackName,
  globalName,
  attributes: getOptions().nonce ? { nonce: getOptions().nonce } : {},
})(ReCAPTCHA);
