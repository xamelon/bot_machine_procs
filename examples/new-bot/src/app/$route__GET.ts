// A bot-specific page; shared administration is available at /bot/channels.
export default function () {
    return { title: "My bot", main: '<h1>My bot</h1><a href="/bot/channels">Channels</a>' };
}
