import hoistStatics from 'hoist-non-react-statics';
import PropTypes from 'prop-types';
import { Component, createElement, forwardRef } from 'react';



let SCRIPT_MAP = {};

// A counter used to generate a unique id for each component that uses the function
let idCount = 0;

export default function makeAsyncScript(getScriptURL, getOptions) {

  return function wrapWithAsyncScript(WrappedComponent) {
    const wrappedComponentName =
      WrappedComponent.displayName || WrappedComponent.name || "Component";

    class AsyncScriptLoader extends Component {
      constructor(props, context) {
        super(props, context);
        this.options = getOptions(props);
        this.state = {};
        this.__scriptURL = "";
      }
      asyncScriptLoaderGetScriptLoaderID() {
        if (!this.__scriptLoaderID) {
          this.__scriptLoaderID = "async-script-loader-" + idCount++;
        }
        return this.__scriptLoaderID;
      }

      setupScriptURL() {
        this.__scriptURL =
          typeof getScriptURL === "function" ? getScriptURL(this.props) : getScriptURL;
        return this.__scriptURL;
      }

      asyncScriptLoaderHandleLoad(state) {
        // use reacts setState callback to fire props.asyncScriptOnLoad with new state/entry
        this.setState(
          state,
          () =>
            this.props.asyncScriptOnLoad &&
            this.props.asyncScriptOnLoad(this.state)
        );
      }

      asyncScriptLoaderTriggerOnScriptLoaded() {
        let mapEntry = SCRIPT_MAP[this.__scriptURL];
        if (!mapEntry) {
          throw new Error("Script is not loaded.");
        }
        if (!mapEntry.loaded) {
          mapEntry.loaded = true;
        }
        this.callObserverFuncAndRemoveObserver(mapEntry, (observer) => {
          observer(mapEntry);
          return true;
        });
        delete window[this.options.callbackName];
      }

      callObserverFuncAndRemoveObserver(mapEntry, func) {
        if (mapEntry) {
          let observersMap = mapEntry.observers;

          for (let obsKey in observersMap) {
            if (func(observersMap[obsKey])) {
              delete observersMap[obsKey];
            }
          }
        }
      }

      componentDidMount() {
        const scriptURL = this.setupScriptURL();
        const key = this.asyncScriptLoaderGetScriptLoaderID();
        const { globalName, callbackName, scriptId } = this.options;

        // check if global object already attached to window
        if (globalName && typeof window[globalName] !== "undefined") {
          SCRIPT_MAP[scriptURL] = { loaded: true, observers: {} };
        }

        // check if script loading already
        if (SCRIPT_MAP[scriptURL]) {
          let entry = SCRIPT_MAP[scriptURL];
          // if loaded or errored then "finish"
          if (entry && (entry.loaded || entry.errored)) {
            this.asyncScriptLoaderHandleLoad(entry);
            return;
          }
          // if still loading then callback to observer queue
          entry.observers[key] = (entry) =>
            this.asyncScriptLoaderHandleLoad(entry);
          return;
        }

        /*
         * hasn't started loading
         * start the "magic"
         * setup script to load and observers
         */
        let observers = {};
        observers[key] = (entry) => this.asyncScriptLoaderHandleLoad(entry);
        SCRIPT_MAP[scriptURL] = {
          loaded: false,
          observers,
        };

        let script = document.createElement("script");

        script.src = scriptURL;
        script.async = true;

        for (let attribute in this.options.attributes) {
          script.setAttribute(attribute, this.options.attributes[attribute]);
        }

        if (scriptId) {
          script.id = scriptId;
        }

        if (callbackName && typeof window !== "undefined") {
          window[callbackName] = () =>
            this.asyncScriptLoaderTriggerOnScriptLoaded();
        }

        script.onload = () => {
          let mapEntry = SCRIPT_MAP[scriptURL];
          if (mapEntry) {
            if (mapEntry.loaded) {
              return;
            }
            mapEntry.loaded = true;
            this.callObserverFuncAndRemoveObserver(mapEntry, (observer) => {
              observer(mapEntry);
              return true;
            });
          }
        };
        script.onerror = () => {
          let mapEntry = SCRIPT_MAP[scriptURL];
          if (mapEntry) {
            mapEntry.errored = true;
            this.callObserverFuncAndRemoveObserver(mapEntry, (observer) => {
              observer(mapEntry);
              return true;
            });
          }
        };

        document.body.appendChild(script);
      }

      componentWillUnmount() {
        // Remove tag script
        const scriptURL = this.__scriptURL;
        if (this.options.removeOnUnmount === true) {
          const allScripts = document.getElementsByTagName("script");
          for (let i = 0; i < allScripts.length; i += 1) {
            if (allScripts[i].src.indexOf(scriptURL) > -1) {
              if (allScripts[i].parentNode) {
                allScripts[i].parentNode.removeChild(allScripts[i]);
              }
            }
          }
        }
        // Clean the observer entry
        let mapEntry = SCRIPT_MAP[scriptURL];
        if (mapEntry) {
          delete mapEntry.observers[this.asyncScriptLoaderGetScriptLoaderID()];
          if (this.options.removeOnUnmount === true) {
            delete SCRIPT_MAP[scriptURL];
          }
        }
      }

      render() {
        const globalName = this.options.globalName;
        // remove asyncScriptOnLoad from childProps
        let { asyncScriptOnLoad, forwardedRef, ...childProps } = this.props; // eslint-disable-line no-unused-vars
        if (globalName && typeof window !== "undefined") {
          childProps[globalName] =
            typeof window[globalName] !== "undefined"
              ? window[globalName]
              : undefined;
        }
        childProps.ref = forwardedRef;
        return createElement(WrappedComponent, childProps);
      }
    }

    // Note the second param "ref" provided by React.forwardRef.
    // We can pass it along to AsyncScriptLoader as a regular prop, e.g. "forwardedRef"
    // And it can then be attached to the Component.
    const ForwardedComponent = forwardRef((props, ref) => {
      return createElement(AsyncScriptLoader, { ...props, forwardedRef: ref });
    });
    ForwardedComponent.displayName = `AsyncScriptLoader(${wrappedComponentName})`;
    ForwardedComponent.propTypes = {
      asyncScriptOnLoad: PropTypes.func,
    };

    return hoistStatics(ForwardedComponent, WrappedComponent);
  };
}
