import SurveyTable from "@/components/survey-table";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const Page = async () => {
  const user = (await cookies()).get("user");
  if (!user) {
    redirect("/login");
  }
  const userData = JSON.parse(user.value);
  return (
    <div className="px-4">
      <h1 className="text-4xl font-extrabold tracking-tight text-balance text-[#262626]">
        Geotagged Videos
      </h1>
      <SurveyTable currentUser={userData} />
    </div>
  );
};

export default Page;
