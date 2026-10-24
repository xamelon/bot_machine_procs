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

test("plain bypasses conversion and other channels are unchanged", () => {
    expect(format(" **literal**\n", "vk", "plain")).toEqual({ text: " **literal**\n" });
    expect(format("**hello**", "telegram")).toEqual({ text: "**hello**" });
    expect(format("")).toEqual({ text: "" });
});
