export const metadata = {
  title: "Transit Server",
  description: "Robot transit service API",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
