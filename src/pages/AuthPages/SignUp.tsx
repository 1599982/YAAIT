import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignUpForm from "../../components/auth/SignUpForm";

export default function SignUp() {
  return (
    <>
      <PageMeta
        title="Yet Another Artificial Intelligence Training"
        description="Where find in head tag?"
      />
      <AuthLayout>
        <SignUpForm />
      </AuthLayout>
    </>
  );
}
