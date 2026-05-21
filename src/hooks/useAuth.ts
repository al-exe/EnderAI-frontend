import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth"
import { exchangeFirebaseToken } from "@/api/auth"
import {
  type Body_login_login_access_token as AccessToken,
  type UserPublic,
  type UserRegister,
  UsersService,
} from "@/client"
import { firebaseAuth } from "@/lib/firebase"
import { getAuthErrorMessage } from "@/lib/firebase-errors"
import useCustomToast from "./useCustomToast"

const isLoggedIn = () => {
  return localStorage.getItem("access_token") !== null
}

const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: "select_account" })

const useAuth = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { showErrorToast } = useCustomToast()

  const { data: user } = useQuery<UserPublic | null, Error>({
    queryKey: ["currentUser"],
    queryFn: UsersService.readUserMe,
    enabled: isLoggedIn(),
  })

  const signUpMutation = useMutation({
    mutationFn: async (data: UserRegister) => {
      const credential = await createUserWithEmailAndPassword(
        firebaseAuth,
        data.email,
        data.password,
      )
      if (data.full_name) {
        await updateProfile(credential.user, { displayName: data.full_name })
      }
      await sendEmailVerification(credential.user).catch(() => undefined)
      const idToken = await credential.user.getIdToken()
      const response = await exchangeFirebaseToken({
        id_token: idToken,
        full_name: data.full_name,
      })
      localStorage.setItem("access_token", response.access_token)
    },
    onSuccess: () => {
      navigate({ to: "/v2/library" })
    },
    onError: (error) => {
      showErrorToast(getAuthErrorMessage(error))
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
    },
  })

  const login = async (data: AccessToken) => {
    const credential = await signInWithEmailAndPassword(
      firebaseAuth,
      data.username,
      data.password,
    )
    const idToken = await credential.user.getIdToken()
    const response = await exchangeFirebaseToken({ id_token: idToken })
    localStorage.setItem("access_token", response.access_token)
  }

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: () => {
      navigate({ to: "/v2/library" })
    },
    onError: async (error) => {
      const currentUser = firebaseAuth.currentUser
      if (
        currentUser &&
        !currentUser.emailVerified &&
        getAuthErrorMessage(error).startsWith("Verify your email")
      ) {
        await sendEmailVerification(currentUser).catch(() => undefined)
      }
      showErrorToast(getAuthErrorMessage(error))
    },
  })

  const googleSignInMutation = useMutation({
    mutationFn: async () => {
      const credential = await signInWithPopup(firebaseAuth, googleProvider)
      const idToken = await credential.user.getIdToken()
      const response = await exchangeFirebaseToken({
        id_token: idToken,
        full_name: credential.user.displayName,
      })
      localStorage.setItem("access_token", response.access_token)
    },
    onSuccess: () => {
      navigate({ to: "/v2/library" })
    },
    onError: (error) => {
      showErrorToast(getAuthErrorMessage(error))
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
    },
  })

  const logout = () => {
    void signOut(firebaseAuth)
    localStorage.removeItem("access_token")
    navigate({ to: "/login" })
  }

  return {
    signUpMutation,
    loginMutation,
    googleSignInMutation,
    logout,
    user,
  }
}

export { isLoggedIn }
export default useAuth
