export const metadata = {
  title: "Money OS Screener API",
  description: "Security screening data service for Money OS",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
