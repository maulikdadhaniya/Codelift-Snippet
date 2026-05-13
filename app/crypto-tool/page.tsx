"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import type { RequestEnvelopeV1, ResponseEnvelopeV1 } from "@/lib/crypto/hybrid-server";
import {
  buildRequestEnvelope,
  decryptResponseEnvelopeAsText,
  exportAesKeyBase64,
  importAesKeyFromBase64,
} from "@/lib/crypto/hybrid-client";

function prettyJson(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export default function CryptoToolPage() {
  const [plainIn, setPlainIn] = useState('{\n  "op": "list"\n}');
  const [envelopeOut, setEnvelopeOut] = useState("");
  const [aesKeyOut, setAesKeyOut] = useState("");

  const [envelopeIn, setEnvelopeIn] = useState("");
  const [decryptedOut, setDecryptedOut] = useState("");

  const [responseEnvelopeIn, setResponseEnvelopeIn] = useState("");
  const [responseAesKeyIn, setResponseAesKeyIn] = useState("");
  const [responseDecryptedOut, setResponseDecryptedOut] = useState("");

  const handleEncrypt = async () => {
    let payload: unknown;
    try {
      payload = JSON.parse(plainIn) as unknown;
    } catch {
      toast.error("Plaintext must be valid JSON");
      return;
    }
    try {
      const { envelope, aesKey } = await buildRequestEnvelope(payload);
      setEnvelopeOut(JSON.stringify(envelope, null, 2));
      setAesKeyOut(await exportAesKeyBase64(aesKey));
      toast.success("Request envelope created");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Encrypt failed");
    }
  };

  const handleDecryptRequest = async () => {
    let env: RequestEnvelopeV1;
    try {
      env = JSON.parse(envelopeIn) as RequestEnvelopeV1;
    } catch {
      toast.error("Paste valid JSON for the envelope");
      return;
    }
    try {
      const res = await fetch("/api/crypto-tool/decrypt-request", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(env),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error || "Decrypt failed");
        setDecryptedOut("");
        return;
      }
      setDecryptedOut(prettyJson(data.data));
      toast.success("Decrypted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Request failed");
    }
  };

  const handleDecryptResponse = async () => {
    let env: ResponseEnvelopeV1;
    try {
      env = JSON.parse(responseEnvelopeIn) as ResponseEnvelopeV1;
    } catch {
      toast.error("Paste valid JSON for the response envelope");
      return;
    }
    try {
      const aesKey = await importAesKeyFromBase64(responseAesKeyIn);
      const text = await decryptResponseEnvelopeAsText(aesKey, env);
      try {
        setResponseDecryptedOut(JSON.stringify(JSON.parse(text), null, 2));
      } catch {
        setResponseDecryptedOut(text);
      }
      toast.success("Response decrypted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Decrypt failed");
      setResponseDecryptedOut("");
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-10 animate-in fade-in duration-300">
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary dark:text-gray-400 mb-4"
        >
          <ArrowLeft size={16} />
          Back to snippets
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Crypto tool</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
          Build the same <strong>request envelopes</strong> the app sends (RSA-OAEP + AES-GCM), or paste an envelope to
          <strong> decrypt the inner JSON</strong> on the server (requires login). To decrypt an API{" "}
          <strong>response</strong> envelope, you need the AES key from the same browser session that made the request
          (use the key shown after encrypt, or from your client debugger).
        </p>
      </div>

      <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">1. Encrypt → request envelope</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          JSON payload (inner plaintext). Uses your session and <code className="text-xs">/api/crypto/public-key</code>.
        </p>
        <textarea
          value={plainIn}
          onChange={(e) => setPlainIn(e.target.value)}
          className="w-full h-36 font-mono text-sm px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary"
          spellCheck={false}
        />
        <button
          type="button"
          onClick={handleEncrypt}
          className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:opacity-90"
        >
          Encrypt to envelope
        </button>
        {envelopeOut && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Envelope (send as POST body)</label>
            <textarea
              readOnly
              value={envelopeOut}
              className="w-full h-40 font-mono text-xs px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-950 text-gray-900 dark:text-gray-100"
            />
          </div>
        )}
        {aesKeyOut && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              AES key (base64) — for decrypting the matching response only
            </label>
            <textarea
              readOnly
              value={aesKeyOut}
              className="w-full h-20 font-mono text-xs px-4 py-3 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/80 dark:bg-amber-950/30 text-gray-900 dark:text-amber-100"
            />
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">2. Decrypt ← request envelope</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Paste <code className="text-xs">v / wrappedKey / iv / ciphertext</code>. Server uses{" "}
          <code className="text-xs">RSA_PRIVATE_KEY_PEM</code>. Response is plain JSON (tool only).
        </p>
        <textarea
          value={envelopeIn}
          onChange={(e) => setEnvelopeIn(e.target.value)}
          placeholder='{"v":1,"wrappedKey":"...","iv":"...","ciphertext":"..."}'
          className="w-full h-36 font-mono text-sm px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary"
          spellCheck={false}
        />
        <button
          type="button"
          onClick={handleDecryptRequest}
          className="px-4 py-2 rounded-xl bg-gray-900 dark:bg-gray-100 dark:text-gray-900 text-white text-sm font-medium hover:opacity-90"
        >
          Decrypt on server
        </button>
        {decryptedOut && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Decrypted data</label>
            <pre className="w-full max-h-80 overflow-auto text-xs px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-950 text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-all">
              {decryptedOut}
            </pre>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">3. Decrypt ← API response envelope</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Response shape: <code className="text-xs">v / iv / ciphertext</code> (no wrappedKey). Paste the AES key from
          section 1 for that same request.
        </p>
        <textarea
          value={responseEnvelopeIn}
          onChange={(e) => setResponseEnvelopeIn(e.target.value)}
          placeholder='{"v":1,"iv":"...","ciphertext":"..."}'
          className="w-full h-28 font-mono text-sm px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary"
          spellCheck={false}
        />
        <textarea
          value={responseAesKeyIn}
          onChange={(e) => setResponseAesKeyIn(e.target.value)}
          placeholder="AES key (base64) from encrypt step"
          className="w-full h-16 font-mono text-xs px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary"
          spellCheck={false}
        />
        <button
          type="button"
          onClick={handleDecryptResponse}
          className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          Decrypt response (in browser)
        </button>
        {responseDecryptedOut && (
          <pre className="w-full max-h-80 overflow-auto text-xs px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-950 text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-all">
            {responseDecryptedOut}
          </pre>
        )}
      </section>
    </div>
  );
}
