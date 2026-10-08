import React from "react";
import { ArrowRight, CircleUserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../app/AuthContext.jsx";
import PageHeading from "../../components/common/PageHeading.jsx";

export default function ProfilePage() {
  const { user } = useAuth();

  return (
    <>
      <PageHeading
        eyebrow="ACCOUNT PROFILE"
        title={<>Your account <span>🪪</span></>}
        description="These are the account details used for your StoryLearn sign-in."
      />
      <section className="panel-card account-profile-card">
        <div className="account-profile-heading"><span className="insight-icon"><CircleUserRound size={19} /></span><div><div className="eyebrow">SIGNED-IN {user.role.toUpperCase()}</div><h2>{user.name}</h2></div></div>
        <dl className="account-profile-details">
          <div><dt>Email</dt><dd>{user.email}</dd></div>
          <div><dt>Active role</dt><dd>{user.role}</dd></div>
          <div><dt>Roles on this account</dt><dd>{(user.roles?.length ? user.roles : [user.role]).join(", ")}</dd></div>
        </dl>
        <Link className="button button-primary" to={user.role === "teacher" ? "/teacher-dashboard" : "/parent-dashboard"}>Back to dashboard <ArrowRight size={16} /></Link>
      </section>
    </>
  );
}
