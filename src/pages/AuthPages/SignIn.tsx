import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignInForm from "../../components/auth/SignInForm";

export default function SignIn() {
  return (
    <>
      <PageMeta
        title="Yet Another Artificial Intelligence Training"
        description="Where find in head tag?"
      />
      <AuthLayout>
        <SignInForm />
      </AuthLayout>
    </>
  );
}
