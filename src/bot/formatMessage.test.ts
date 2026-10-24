import { test, expect } from "bun:test";
import { testCtx } from "../$test";

const ctx = await testCtx();
const format = (text: string, channel = "vk", mode?: string) => ctx.fns.bot.formatMessage({ text, channel, format: mode });

test("MAX enables Markdown by default and preserves explicit modes", () => {
    expect(format("**Важно**", "max")).toEqual({ text: "**Важно**", format: "markdown" });
    expect(format("<b>Важно</b>", "max", "html")).toEqual({ text: "<b>Важно</b>", format: "html" });
    expect(format("**literal**", "max", "plain")).toEqual({ text: "**literal**" });
});

test("VK keeps readable headings, emphasis, links and line breaks", () => {
    expect(format("# Фестиваль\n\n**Важно**: *сегодня*\nПриходите!\n\n[Билеты](https://example.org/pay)")).toEqual({
        text: "Фестиваль\n\nВажно: сегодня\nПриходите!\n\nБилеты — https://example.org/pay",
    });
    expect(format("https://example.org/pay").text).toBe("https://example.org/pay");
    expect(format("[https://example.org](https://example.org)").text).toBe("https://example.org");
});

test("VK preserves list markers and numbering", () => {
    expect(format("- **Вход**\n- Билеты").text).toBe("• Вход\n• Билеты");
    expect(format("3. Вход\n4. Билеты").text).toBe("3. Вход\n4. Билеты");
    expect(format("- Верх\n  - Внутри\n- Низ").text).toBe("• Верх\n  • Внутри\n• Низ");
});

test("VK preserves code, escaped punctuation and literal HTML", () => {
    expect(format("`a_b * c` и \\*буквально\\*").text).toBe("a_b * c и *буквально*");
    expect(format("```\na_b * c\nx_y\n```").text).toBe("a_b * c\nx_y");
    expect(format("<b>не HTML</b> & текст").text).toBe("<b>не HTML</b> & текст");
    expect(format("user_name, 2 * 3 = 6").text).toBe("user_name, 2 * 3 = 6");
});

test("Telegram gets its HTML subset: emphasis, links, code, quotes", () => {
    expect(format("🎪 **Кальяновый фестиваль**\n\nОдин день *дыма* и ~~скуки~~.", "telegram")).toEqual({
        text: "🎪 <b>Кальяновый фестиваль</b>\n\nОдин день <i>дыма</i> и <s>скуки</s>.",
        parseMode: "HTML",
    });
    expect(format("# Программа\n\n- **12:00** вход\n- 14:00 [голосование](https://x.org/?a=1&b=\"2\")", "telegram").text)
        .toBe("<b>Программа</b>\n\n• <b>12:00</b> вход\n• 14:00 <a href=\"https://x.org/?a=1&amp;b=&quot;2&quot;\">голосование</a>");
    expect(format("`a<b`\n\n```js\nx < 1 && y\n```\n\n> цитата", "telegram").text)
        .toBe("<code>a&lt;b</code>\n\n<pre><code class=\"language-js\">x &lt; 1 &amp;&amp; y</code></pre>\n\n<blockquote>цитата</blockquote>");
});

test("Telegram escapes what is not Markdown, and keeps explicit modes", () => {
    // Raw HTML in a node is text, not markup: it must not break or inject entities.
    expect(format("<b>не HTML</b> & текст, 2 < 3", "telegram").text).toBe("&lt;b&gt;не HTML&lt;/b&gt; &amp; текст, 2 &lt; 3");
    expect(format("user_name, 2 * 3 = 6 \\*буквально\\*", "telegram").text).toBe("user_name, 2 * 3 = 6 *буквально*");
    expect(format("<b>Важно</b>", "telegram", "html")).toEqual({ text: "<b>Важно</b>", parseMode: "HTML" });
    expect(format("**literal**", "telegram", "plain")).toEqual({ text: "**literal**" });
    expect(format("", "telegram")).toEqual({ text: "", parseMode: "HTML" });
});

test("plain bypasses conversion and other channels are unchanged", () => {
    expect(format(" **literal**\n", "vk", "plain")).toEqual({ text: " **literal**\n" });
    expect(format("**hello**", "echo")).toEqual({ text: "**hello**" });
    expect(format("")).toEqual({ text: "" });
});
