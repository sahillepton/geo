import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/sidebar";
import { cookies } from "next/headers";
import { User } from "@/lib/types";
import Header from "@/components/sidebar/header";

const Layout = async ({ children }: { children: React.ReactNode }) => {
  const user = (await cookies()).get("user");
  let userData: User | null = null;
  if (user) {
    userData = JSON.parse(user?.value || "{}");
  }

  return (
    <SidebarProvider>
      {user && userData && (
        <AppSidebar
          user={{
            user_id: userData.user_id,
            username: userData.username,
            email: userData.email,
            role: userData.role,
          }}
        />
      )}

      <SidebarInset>
        {user && userData && <Header user={userData} />}
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
};

export default Layout;
