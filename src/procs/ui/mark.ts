// The product's mark, as SVG. One place, because it is drawn in three: the rail
// at the top of a host, `/procs/ui/favicon.svg` in the tab, and the manager's
// own `/favicon.ico`. A tab that is not the product's mark is a tab nobody finds
// in a row of twenty, and a second drawing of it is a second product.
//
// A function rather than a shared constant: modules do not import each other
// here, they call — so a host that is not this package still gets the same
// bytes.
export default function (_ctx: Context, _session: Session | null, opts?: { size?: number }): string {
    const size = opts?.size ? ` width="${opts.size}" height="${opts.size}"` : "";
    return `<svg xmlns="http://www.w3.org/2000/svg"${size} viewBox="0 0 36 36" fill="none" aria-hidden="true"><g clip-path="url(#lg_clip)"><path d="M17.7062 0.0958679C17.888 -0.00921202 18.112 -0.00921216 18.2938 0.0958678L33.3383 8.7935C33.5198 8.8984 33.6315 9.09208 33.6315 9.30166V26.6983C33.6315 26.9079 33.5198 27.1016 33.3383 27.2065L18.2938 35.9041C18.112 36.0092 17.888 36.0092 17.7062 35.9041L2.66168 27.2065C2.48023 27.1016 2.36848 26.9079 2.36848 26.6983V9.30166C2.36848 9.09208 2.48023 8.8984 2.66168 8.7935L17.7062 0.0958679Z" fill="url(#lg_grad)"/><path d="M23.6981 15.1479L29.3945 18.4476L23.6983 21.7472L18.0019 18.4476L23.6981 15.1479Z" fill="#FFF1F0"/><path d="M23.6963 21.7471L23.6963 28.3463L18.0001 25.0469L18.0001 18.4476L23.6963 21.7471Z" fill="#FFCDC7"/><path d="M17.9823 11.9151L12.2672 8.61547L12.2764 15.1983L17.9915 18.4979L17.9823 11.9151Z" fill="#FFCDC7"/><path d="M12.3038 15.1479L6.60737 18.4476L12.3035 21.7472L17.9999 18.4476L12.3038 15.1479Z" fill="#FFF1F0"/><path d="M17.9983 5.3158L12.3019 8.61541L17.998 11.915L23.6944 8.61541L17.9983 5.3158Z" fill="#FFF1F0"/><path d="M12.3018 21.7471L12.3018 28.3463L6.60556 25.0469L6.60556 18.4476L12.3018 21.7471Z" fill="#FFCDC7"/></g><defs><linearGradient id="lg_grad" x1="18" y1="0" x2="18" y2="36" gradientUnits="userSpaceOnUse"><stop stop-color="#EA4A35"/><stop offset="1" stop-color="#F39387"/></linearGradient><clipPath id="lg_clip"><rect width="36" height="36" fill="white"/></clipPath></defs></svg>`;
}
