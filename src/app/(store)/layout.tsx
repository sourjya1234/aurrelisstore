import { Footer } from "@/components/footer";
import { Header } from "@/components/header";

export default function StoreLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
