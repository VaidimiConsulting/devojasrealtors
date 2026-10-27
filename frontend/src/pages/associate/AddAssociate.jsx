import React from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AssociateRegistrationForm from '../../components/AssociateRegistrationForm';

// Associate panel -> Add Associate: the same registration form as the public signup / Admin panel.
// The sponsor is locked to the logged-in associate (and enforced again on the backend).
const AddAssociate = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="space-y-5 animate-fade-in max-w-xl">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2"><UserPlus size={24} className="text-gold" />Add Associate</h1>
          <p className="page-subtitle">Register a new associate directly under you</p>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <AssociateRegistrationForm
          key={user?.id}
          endpoint="/associate/team"
          sponsorValue={user?.login_id || ''}
          sponsorLocked
          sponsorLabel="Sponsor (You)"
          intro="The new associate will be registered directly under you. Commission is set by Admin."
          submitLabel="Register Associate"
          doneLabel="View My Team Network"
          onSuccess={() => navigate('/associate/team')}
        />
      </div>
    </div>
  );
};

export default AddAssociate;
