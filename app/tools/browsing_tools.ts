import puppeteer, { Browser, Page } from "puppeteer";
import * as fs from "fs";
import * as path from "path";

let browser: Browser | null = null;
let page: Page | null = null;

async function initBrowser() {
    if (!browser || !browser.connected) {
        browser = await puppeteer.launch({
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });
        page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });
        // Accept all dialogs automatically
        page.on("dialog", async (dialog) => dialog.dismiss());
    }
    return page!;
}

export async function browseUrl(url: string) {
    try {
        const p = await initBrowser();
        await p.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
        const content = await p.evaluate(() => document.body.innerText);
        return content.slice(0, 10000) || "No content found";
    } catch (error: any) {
        return `Error browsing URL: ${error.message}`;
    }
}

export async function browserAction(
    action: string,
    url?: string,
    selector?: string,
    text?: string,
) {
    try {
        const p = await initBrowser();

        switch (action) {
            case "navigate":
                if (!url) return "Error: url is required for navigate action.";
                await p.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
                return `Navigated to ${url}`;

            case "get_interactive_elements": {
                // Returns all inputs, buttons, links and their selectors — lets the
                // LLM discover the correct selectors without guessing.
                const elements = await p.evaluate(() => {
                    const results: { tag: string; type?: string; id?: string; name?: string; placeholder?: string; text?: string; selector: string }[] = [];
                    const add = (el: Element, extra: object = {}) => {
                        const id = el.id ? `#${el.id}` : "";
                        const name = el.getAttribute("name") ? `[name="${el.getAttribute("name")}"]` : "";
                        const type = el.getAttribute("type") ? `[type="${el.getAttribute("type")}"]` : "";
                        const selector = id || name || `${el.tagName.toLowerCase()}${type}`;
                        results.push({ tag: el.tagName.toLowerCase(), selector, ...extra });
                    };
                    document.querySelectorAll("input, textarea, select").forEach(el =>
                        add(el, {
                            type: el.getAttribute("type") ?? undefined,
                            id: el.id || undefined,
                            name: el.getAttribute("name") ?? undefined,
                            placeholder: el.getAttribute("placeholder") ?? undefined,
                        })
                    );
                    document.querySelectorAll("button, [role='button'], input[type='submit']").forEach(el =>
                        add(el, { text: (el as HTMLElement).innerText?.trim().slice(0, 60) || undefined })
                    );
                    document.querySelectorAll("a").forEach(el =>
                        add(el, { text: (el as HTMLElement).innerText?.trim().slice(0, 60) || undefined })
                    );
                    return results;
                });
                return JSON.stringify(elements, null, 2);
            }

            case "type":
                if (!selector) return "Error: selector is required for type action.";
                if (text === undefined) return "Error: text is required for type action.";
                await p.waitForSelector(selector, { timeout: 10000 });
                await p.click(selector);
                await p.evaluate(
                    (sel) => { (document.querySelector(sel) as HTMLInputElement).value = ""; },
                    selector,
                );
                await p.type(selector, text);
                return `Typed "${text}" into "${selector}"`;

            case "click":
                if (!selector) return "Error: selector is required for click action.";
                await p.waitForSelector(selector, { timeout: 10000 });
                await p.click(selector);
                await new Promise((r) => setTimeout(r, 2000));
                return `Clicked "${selector}"`;

            case "wait": {
                // Wait for a selector to appear after dynamic rendering
                if (!selector) return "Error: selector is required for wait action.";
                await p.waitForSelector(selector, { timeout: 15000 });
                return `Element "${selector}" is now present`;
            }

            case "extract_text": {
                const content = await p.evaluate(() => document.body.innerText);
                return content.slice(0, 10000) || "No content found";
            }

            case "screenshot": {
                const ssDir = path.resolve("ss");
                if (!fs.existsSync(ssDir)) fs.mkdirSync(ssDir, { recursive: true });
                const ts = new Date().toISOString().replace(/[:.]/g, "-");
                const filename = path.join(ssDir, `screenshot-${ts}.png`);
                await p.screenshot({ path: filename, fullPage: true });
                return `Screenshot saved to ${filename}`;
            }

            case "close":
                await browser?.close();
                browser = null;
                page = null;
                return "Browser closed.";

            default:
                return `Unknown browser action: ${action}`;
        }
    } catch (error: any) {
        return `Error performing browser action: ${error.message}`;
    }
}
