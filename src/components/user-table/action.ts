"use server";

import { createClient } from "@/lib/supabase-server";
import { cookies } from "next/headers";
import { z } from "zod";



export const addUser = async (prevState: any, formData: FormData) => {
    const supabase = await createClient()

    const addUserSchema = z.object({
        username: z.string().min(4, {message : "Username must be at least 4 characters long"}),
        email: z.string().email({message : "Invalid email address"}),
        password: z.string().min(8, {message : "Password must be at least 8 characters long"}),
        role: z.string().min(1, {message : "Role is required"}),
        location: z.string().optional(),
        manager_id: z.string().optional(),
    })


    const validatedFields = addUserSchema.safeParse({
        username: formData.get("username"),
        email: formData.get("email"),
        password: formData.get("password"),
        role: formData.get("role"),
        location: formData.get("location"),
    })

    const user = (await cookies()).get("user")
    const userData = JSON.parse(user?.value || "{}")

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
        }
    }

    const findUser = await supabase.from("users").select("user_id").eq("email", validatedFields.data.email).single()
    console.log(findUser, "findUser")
    if (findUser.data) {
        return {
            errors: {
                email: "Email already exists",
            },
        }
    }
    

    const { data, error } = await supabase.from("users")
    .insert([
      {
        username: validatedFields.data.username,
        email: validatedFields.data.email,
        password: validatedFields.data.password,
        role: validatedFields.data.role,
        location: validatedFields.data.location,
        manager_id: userData.role === "manager" ? userData.user_id : validatedFields.data.manager_id,
      },
    ])
    .select();

    if (error) {
        throw error;
    }

    return {
        message: "User added successfully",
  };
};


export const editUser = async (prevState: any, formData: FormData) => {
    const supabase = await createClient()

    const editUserSchema = z.object({
        username: z.string().optional(),
        email: z.string().optional(),
        password: z.string().optional(),
        role: z.string().optional(),
        location: z.string().optional(),
        manager_id: z.string().optional(),
        userId: z.string().optional(),
    })

    const validatedFields = editUserSchema.safeParse({
        username: formData.get("username"),
        email: formData.get("email"),
        password: formData.get("password"),
        role: formData.get("role"),
        location: formData.get("location"),
        userId: formData.get("userId"),
    })
    
    if (!validatedFields.success) {
        console.log(validatedFields.error.flatten().fieldErrors, "errors updating user");
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            success: false,
        }
    }

    console.log(validatedFields.data.userId, "updating user");

    const updateData: Record<string, any> = {};

if (validatedFields.data.username) updateData.username = validatedFields.data.username;
if (validatedFields.data.email) updateData.email = validatedFields.data.email;
if (validatedFields.data.password) updateData.password = validatedFields.data.password;
if (validatedFields.data.role) updateData.role = validatedFields.data.role;
if (validatedFields.data.location) updateData.location = validatedFields.data.location;

    const { data, error } = await supabase.from("users").update(updateData).eq("user_id", validatedFields.data.userId)

    if (error) {
        throw error;
    }

    return {
        message: "User updated successfully",
        success: true,
    }
}


export const deleteUser = async(userId : string) => {
    console.log(userId, "userId to be deleted");
    const supabase = await createClient()

    const { data: managedUsers, error: checkError } = await supabase
        .from("users")
        .select("user_id")
        .eq("manager_id", userId);

    if (managedUsers && managedUsers.length > 0) {
        return {
            error: "Cannot delete user who is a manager for other users. Please reassign those users first.",
        }
    }

    const { data, error } = await supabase.from("users").delete().eq("user_id", userId)

    if (error) {
        return {
            error: "Error deleting user",
        }
    }

    return {
        message: "User deleted successfully",
    }
}