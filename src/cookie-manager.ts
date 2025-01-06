export class CookieManager {
    private cookieFilePath = ".cookies.json";

    private async readCookies(): Promise<Record<string, string>> {
        try {
            const data = await Deno.readTextFile(this.cookieFilePath);
            return JSON.parse(data);
        } catch (error) {
            if (!(error instanceof Deno.errors.NotFound)) {
                throw error;
            }
            return {};
        }
    }

    private async writeCookies(cookies: Record<string, string>): Promise<void> {
        const data = JSON.stringify(cookies, null, 2);
        await Deno.writeTextFile(this.cookieFilePath, data);
    }

    async updateFromSetCookie(
        setCookieHeader: string | string[] | undefined,
    ): Promise<void> {
        if (!setCookieHeader) return;

        const cookies = await this.readCookies();
        const headers = Array.isArray(setCookieHeader)
            ? setCookieHeader
            : [setCookieHeader];

        for (const header of headers) {
            const [cookieStr] = header.split(";");
            const [key, value] = cookieStr.split("=");
            if (key && value) {
                cookies[key.trim()] = value.trim();
            }
        }

        await this.writeCookies(cookies);
    }

    async getCookieHeader(): Promise<string> {
        const cookies = await this.readCookies();
        return Object.entries(cookies)
            .map(([key, value]) => `${key}=${value}`)
            .join("; ");
    }
}