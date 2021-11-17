import makeAsyncScriptLoader from './async-script-loader';
import ReCAPTCHA from './recaptcha';

const callbackName = "onloadcallback";
const globalName = "grecaptcha";

function getAttributes() {
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

function getOptions(props) {

  return {
    callbackName,
    globalName: props.provider === 'hcaptcha' ? 'hcaptcha' : 'grecaptcha',
    attributes: getAttributes().nonce ? { nonce: getAttributes().nonce } : {},
  }
}
export default makeAsyncScriptLoader(getURL, getOptions)(ReCAPTCHA);
