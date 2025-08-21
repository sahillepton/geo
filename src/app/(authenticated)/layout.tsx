import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/sidebar";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { User } from "@/lib/types";
import Header from "@/components/sidebar/header";

const Layout = async ({ children }: { children: React.ReactNode }) => {
  const user = (await cookies()).get("user");
  if (!user) {
    redirect("/login");
  }
  const userData: User = JSON.parse(user?.value || "{}");

  return (
    <SidebarProvider>
      <AppSidebar
        user={{
          user_id: userData.user_id,
          username: userData.username,
          email: userData.email,
          role: userData.role,
        }}
      />
      <SidebarInset>
        <Header />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
};

export default Layout;
