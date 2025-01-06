import { crypto } from "jsr:@std/crypto";
import { CookieManager } from "./cookie-manager.ts";

class KeeneticApiException extends Error {
    constructor(
        public status_code: number,
        public response_text: string,
    ) {
        super(`API Error: ${status_code} - ${response_text}`);
    }
}


class KeeneticClient {
    private _admin_endpoint: string;
    private _skip_auth: boolean;
    private _login: string;
    private _password: string;
    private _cookieManager: CookieManager;

    constructor(
        admin_endpoint: string,
        skip_auth: boolean,
        login: string,
        password: string,
    ) {
        this._admin_endpoint = admin_endpoint;
        this._skip_auth = skip_auth;
        this._login = login;
        this._password = password;
        this._cookieManager = new CookieManager();
    }
    private async hashMd5(text: string): Promise<string> {
        const encoder = new TextEncoder();
        const data = encoder.encode(text);
        const hashBuffer = await crypto.subtle.digest("MD5", data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
    private async getEncryptedPassword(token: string, realm: string): Promise<string> {
        const md5Input = `${this._login}:${realm}:${this._password}`;
        const md5Hash = await this.hashMd5(md5Input);

        const encoder = new TextEncoder();
        const shaInput = token + md5Hash;
        const data = encoder.encode(shaInput);
        const hashBuffer = await crypto.subtle.digest("SHA-256", data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
    private async makeRequest(url: string, options: RequestInit = {}): Promise<Response> {
        const headers = new Headers(options.headers);
        headers.set('accept', 'application/json, text/plain, */*');
        headers.set('accept-language', 'en-US,en;q=0.9');

        const cookieHeader = await this._cookieManager.getCookieHeader();
        if (cookieHeader) {
            headers.set('cookie', cookieHeader);
        }

        const response = await fetch(url, {
            ...options,
            headers,
            credentials: 'include',
        });

        const setCookieHeaders = response.headers.getSetCookie();
        await this._cookieManager.updateFromSetCookie(setCookieHeaders);

        return response;
    }

    private async consumeResponse(response: Response): Promise<void> {
        try {
            await response.text();
        } catch {
            // Ignore errors during consumption
        }
    }

    private async _auth(): Promise<boolean> {
        if (this._skip_auth) {
            return true;
        }

        const auth_endpoint = `${this._admin_endpoint}/auth`;

        let checkAuthResponse: Response | undefined;
        try {
            checkAuthResponse = await this.makeRequest(auth_endpoint);

            if (checkAuthResponse?.status === 401) {
                console.error('ADASda')
                const ndm_challenge = checkAuthResponse.headers.get('X-NDM-Challenge');
                const ndm_realm = checkAuthResponse.headers.get('X-NDM-Realm');

                if (!ndm_challenge || !ndm_realm) {
                    throw new Error("Missing challenge or realm headers");
                }

                await this.consumeResponse(checkAuthResponse);

                const encryptedPassword = await this.getEncryptedPassword(ndm_challenge, ndm_realm);

                const authResponse = await this.makeRequest(auth_endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        login: this._login,
                        password: encryptedPassword,
                    }),
                });

                const success = authResponse.status === 200;
                await this.consumeResponse(authResponse);

                if (success) {
                    return true;
                } else {
                    throw new Error(`Keenetic authorisation failed. Status ${authResponse.status}`);
                }
            } else if (checkAuthResponse.status === 200) {
                await this.consumeResponse(checkAuthResponse);
                return true;
            }

            await this.consumeResponse(checkAuthResponse);
            throw new Error(`Failed to check authorisation, status unknown (${checkAuthResponse.status})`);
        } catch (error) {
            if (checkAuthResponse) {
                await this.consumeResponse(checkAuthResponse);
            }
            throw error;
        }
    }

    async metric(command: string, params?: Record<string, string>): Promise<any> {
        if (await this._auth()) {
            const queryParams = new URLSearchParams(params ?? {});
            const url = `${this._admin_endpoint}/rci/show/${command.replace(' ', '/')}?${queryParams}`;

            const response = await this.makeRequest(url);

            try {
                if (response.status === 200) {
                    return await response.json();
                }
                const errorText = await response.text();
                throw new KeeneticApiException(response.status, errorText);
            } catch (error) {
                throw error;
            }
        } else {
            throw new Error("No keenetic connection.");
        }
    }
}

export { KeeneticClient, KeeneticApiException };