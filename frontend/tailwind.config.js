/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                nice: {
                    blue: '#0066CC',
                    lightblue: '#4A9EFF',
                    sky: '#E3F2FD',
                    white: '#FFFFFF',
                    gray: '#F5F7FA',
                    dark: '#1A1A1A',
                }
            }
        },
    },
    plugins: [],
}
