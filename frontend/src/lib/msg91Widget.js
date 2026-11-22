/**
 * MSG91 OTP Widget Integration Helper for SimpleDSC.
 * Wraps official MSG91 Web SDK (otp-provider.js) with exposeMethods: true
 * providing clean Promises, robust fallback handling, and seamless React integration.
 */

export const MSG91_CONFIG = {
  widgetId: "366b76697a6b373331373736",
  tokenAuth: "592529Trr8YzZZWos66b02bc2bP1",
};

/**
 * Normalizes Indian phone number into standard 12-digit format starting with 91
 * e.g. "9876543210" -> "919876543210"
 */
export function normalizeIdentifier(rawMobile) {
  const digits = String(rawMobile || "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    return digits;
  }
  if (digits.length === 11 && digits.startsWith("0")) {
    return `91${digits.slice(1)}`;
  }
  if (digits.length === 10) {
    return `91${digits}`;
  }
  return digits;
}

/**
 * Ensures MSG91 SDK script is loaded and widget methods are exposed on window
 */
export function waitForWidgetReady(maxWaitMs = 8000) {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && typeof window.sendOtp === "function" && typeof window.verifyOtp === "function") {
      return resolve(true);
    }

    // Try initializing if initSendOTP exists but methods aren't bound yet
    if (typeof window !== "undefined" && typeof window.initSendOTP === "function" && window.configuration) {
      try {
        window.initSendOTP(window.configuration);
      } catch (err) {
        console.warn("[MSG91 Widget] Re-init attempt warning:", err);
      }
    }

    const startTime = Date.now();
    const interval = setInterval(() => {
      if (typeof window !== "undefined" && typeof window.sendOtp === "function" && typeof window.verifyOtp === "function") {
        clearInterval(interval);
        return resolve(true);
      }
      if (Date.now() - startTime > maxWaitMs) {
        clearInterval(interval);
        resolve(false);
      }
    }, 200);
  });
}

/**
 * Send OTP via MSG91 OTP Widget
 * @param {string} mobile 10-digit Indian mobile number
 * @returns {Promise<{ok: boolean, requestId?: string, data?: any}>}
 */
export async function sendWidgetOtp(mobile) {
  const identifier = normalizeIdentifier(mobile);
  if (!identifier || identifier.length < 12) {
    throw new Error("Please enter a valid 10-digit mobile number");
  }

  const ready = await waitForWidgetReady();
  if (!ready || typeof window.sendOtp !== "function") {
    throw new Error("SMS verification provider is loading. Please check your internet connection and try again.");
  }

  return new Promise((resolve, reject) => {
    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        reject(new Error("OTP request timed out. Please check mobile connection and try again."));
      }
    }, 15000);

    const onSuccess = (response) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeout);
      const reqId = response?.message || response?.reqId || response?.requestId || response?.data?.requestId;
      resolve({ ok: true, requestId: reqId, data: response });
    };

    const onFailure = (error) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeout);
      const errMsg =
        error?.message ||
        error?.data?.message ||
        (typeof error === "string" ? error : "Could not send OTP. Please check your mobile number.");
      reject(new Error(errMsg));
    };

    try {
      window.sendOtp(identifier, onSuccess, onFailure);
    } catch (e) {
      clearTimeout(timeout);
      reject(new Error(e.message || "Failed to trigger OTP delivery."));
    }
  });
}

/**
 * Verify OTP entered by customer via MSG91 widget
 * @param {string} otp 6-digit OTP
 * @param {string} [requestId] Optional requestId from sendWidgetOtp
 * @returns {Promise<{ok: boolean, token: string, raw: any}>}
 */
export async function verifyWidgetOtp(otp, requestId = null) {
  const cleanOtp = String(otp || "").trim();
  if (!cleanOtp) {
    throw new Error("Please enter the OTP received on your mobile");
  }

  const ready = await waitForWidgetReady();
  if (!ready || typeof window.verifyOtp !== "function") {
    throw new Error("Verification service unavailable. Please refresh and try again.");
  }

  return new Promise((resolve, reject) => {
    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        reject(new Error("OTP verification timed out. Please try again."));
      }
    }, 15000);

    const handleSuccess = (response) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeout);

      // Extract verified access token or response token
      let token = "";
      if (typeof response === "string") {
        token = response;
      } else if (response) {
        token =
          response["access-token"] ||
          response.accessToken ||
          response.token ||
          response.message ||
          response.data?.token ||
          "";
      }

      resolve({ ok: true, token, raw: response });
    };

    const handleFailure = (error) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeout);
      const errMsg =
        error?.message ||
        error?.data?.message ||
        (typeof error === "string" ? error : "Invalid OTP code. Please check and try again.");
      reject(new Error(errMsg));
    };

    // Temporarily attach global hooks in case SDK invokes configuration.success
    const originalSuccess = window.__msg91_onSuccess;
    const originalFailure = window.__msg91_onFailure;

    window.__msg91_onSuccess = (data) => {
      handleSuccess(data);
      window.__msg91_onSuccess = originalSuccess;
    };
    window.__msg91_onFailure = (err) => {
      handleFailure(err);
      window.__msg91_onFailure = originalFailure;
    };

    try {
      window.verifyOtp(cleanOtp, handleSuccess, handleFailure, requestId);
    } catch (e) {
      clearTimeout(timeout);
      reject(new Error(e.message || "Failed to submit OTP for verification."));
    }
  });
}

/**
 * Resend / Retry OTP via MSG91 widget
 * @param {string} [channel] Optional channel
 * @param {string} [requestId] Optional requestId
 */
export async function retryWidgetOtp(channel = null, requestId = null) {
  const ready = await waitForWidgetReady();
  if (!ready || typeof window.retryOtp !== "function") {
    throw new Error("SMS retry service unavailable. Please refresh and try again.");
  }

  return new Promise((resolve, reject) => {
    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        reject(new Error("Resend request timed out. Please try again in a few moments."));
      }
    }, 15000);

    const onSuccess = (response) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeout);
      resolve({ ok: true, data: response });
    };

    const onFailure = (error) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeout);
      const errMsg =
        error?.message ||
        error?.data?.message ||
        (typeof error === "string" ? error : "Could not resend OTP. Please wait a moment and try again.");
      reject(new Error(errMsg));
    };

    try {
      window.retryOtp(channel, onSuccess, onFailure, requestId);
    } catch (e) {
      clearTimeout(timeout);
      reject(new Error(e.message || "Failed to trigger OTP resend."));
    }
  });
}
