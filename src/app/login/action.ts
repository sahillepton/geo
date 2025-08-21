"use server";
import { createClient } from "@/lib/supabase-server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

export type FormState = {errors ? : { email ? : string[], password ?: string[]}} | undefined
export async function login(state: FormState, formData: FormData, ) {
    const schema = z.object({
        email: z.string().email({ message: 'Please enter a valid email.' }).trim(),
  password: z
    .string()
    .min(8, { message: 'Be at least 8 characters long' })
    .trim(),
    });

    const validatedFields = schema.safeParse({
        email: formData.get('email'),
        password: formData.get('password'),
    });

    if (!validatedFields.success) {
        return {
          errors: validatedFields.error.flatten().fieldErrors,
        }
    }

    const { email, password } = validatedFields.data;

    try {



    const supabase = await createClient();

    const { data: userData, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .single();

    if (!userData || userData.password !== password) {
        return {
            errors: {
                password: ['Invalid email or password'],
            },
        }
    }

        (await cookies()).set("user", JSON.stringify(userData), {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 60 * 60 * 24 * 30,
            path: "/",
        })
        revalidatePath("/login")
    } catch (error) {
        console.error(error);
    }
}