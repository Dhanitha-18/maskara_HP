import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePayment } from '../../context/PaymentContext';
import { useAuth } from '../../context/AuthContext';
import { HeroBanner } from '../../components/layout/HeroBanner';
import { ArrowLeft, ArrowRight, Save, ShieldAlert } from 'lucide-react';
import { API_BASE_URL } from '../../services/api';

export const ApplicationForm: React.FC = () => {
  const { submitApplication, updateStudent } = usePayment();
  const { login, studentUsn } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  // Form fields states
  const [quota, setQuota] = useState('CET');
  const [rank, setRank] = useState('');
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState('Male');
  const [dob, setDob] = useState('');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [nationality, setNationality] = useState('Indian');
  const [religion, setReligion] = useState('');
  const [aadhaar, setAadhaar] = useState('');
  const [usn, setUsn] = useState(studentUsn || '');
  const [bmsitId, setBmsitId] = useState('');
  const [program, setProgram] = useState('');
  const [branch, setBranch] = useState('');
  const [course] = useState('');
  const [sem, setSem] = useState('1st Semester');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');
  const [permanentAddress, setPermanentAddress] = useState('');
  const [photoName, setPhotoName] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const ugBranches = [
    'Artificial Intelligence and Machine Learning (AI & ML)',
    'Computer Science and Engineering (CSE)',
    'Computer Science and Business Systems (CSBS)',
    'Electronics and Communication Engineering (ECE)',
    'Electrical and Electronics Engineering (EEE)',
    'Mechanical Engineering (ME)',
    'Civil Engineering (CE)',
    'Bachelor of Architecture (B.Arch)'
  ];

  const pgBranches = [
    'Master of Computer Applications (MCA)',
    'M.Tech in Computer Science and Engineering',
    'M.Tech in Cyber Security',
    'M.Tech in VLSI System Design',
    'Master of Business Administration (MBA)'
  ];

  const handleProgramChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setProgram(e.target.value);
    setBranch('');
  };

  // Parent details
  const [fatherName, setFatherName] = useState('');
  const [fatherOcc, setFatherOcc] = useState('');
  const [fatherPhone, setFatherPhone] = useState('');
  const [fatherEmail, setFatherEmail] = useState('');
  const [motherName, setMotherName] = useState('');
  const [motherOcc, setMotherOcc] = useState('');
  const [motherPhone, setMotherPhone] = useState('');
  const [motherEmail, setMotherEmail] = useState('');
  const [communicationAddress, setCommunicationAddress] = useState('');

  // Local Guardian details
  const [lgName, setLgName] = useState('');
  const [lgRel, setLgRel] = useState('');
  const [lgPhone, setLgPhone] = useState('');
  const [lgAddress, setLgAddress] = useState('');

  // Medical info
  const [healthIssues, setHealthIssues] = useState('');
  const [allergies, setAllergies] = useState('');
  const [medication, setMedication] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');

  // Undertaking
  const [undertakingCheck, setUndertakingCheck] = useState(false);
  const [signature, setSignature] = useState('');
  const [sigDate, setSigDate] = useState(new Date().toISOString().split('T')[0]);

  const [formErrors, setFormErrors] = useState<string | null>(null);

  const handleNextStep = () => {
    if (step === 1) {
      if (!fullName || !dob || !aadhaar || !program || !branch || !contact || !email) {
        setFormErrors(
          nationality === 'Other'
            ? "Please fill in all required student details including Passport Number."
            : "Please fill in all required student details including Aadhaar Number."
        );
        return;
      }
    } else if (step === 2) {
      if (!fatherName || !fatherPhone || !motherName || !motherPhone) {
        setFormErrors("Please fill in parent contact names and phone numbers.");
        return;
      }
    }
    setFormErrors(null);
    setStep(prev => prev + 1);
  };

  const handlePrevStep = () => {
    setFormErrors(null);
    setStep(prev => prev - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!undertakingCheck || !signature || !sigDate) {
      setFormErrors(
        "You must accept the student undertaking declaration and sign the form."
      );
      return;
    }

    const finalCourse = program && branch ? `${program} - ${branch}` : course || branch;
    const finalUsn = usn || bmsitId || studentUsn || `APP-${Date.now()}`;

    try {
      let uploadedPhotoUrl = "";
      if (photoFile) {
        try {
          const formData = new FormData();
          formData.append('photo', photoFile);
          const uploadResponse = await fetch(`${API_BASE_URL}/api/upload`, {
            method: 'POST',
            body: formData,
          });
          if (uploadResponse.ok) {
            const uploadResJson = await uploadResponse.json();
            uploadedPhotoUrl = uploadResJson.imageUrl;
          } else {
            console.error("Failed to upload photo file");
          }
        } catch (uploadErr) {
          console.error("Error uploading photo:", uploadErr);
        }
      }

      updateStudent({
        name: fullName,
        usn: finalUsn,
        department: finalCourse,
        semester: parseInt(sem) || 1,
        email: email,
        phone: contact,
        address: permanentAddress,
        parentContact: `${fatherName} (${fatherPhone})`,
      });

      await submitApplication({
        bmsitId: bmsitId || null,
        studentName: fullName,
        gender: gender,
        phoneNumber: contact,
        email: email,
        dob: dob,
        program: program || null,
        semester: sem || null,
        branch: branch || null,
        bloodGroup: bloodGroup || null,
        aadhaarNumber: aadhaar || null,
        nationality: nationality || null,
        religion: religion || null,
        permanentAddress: permanentAddress || null,
        fatherName: fatherName,
        fatherPhone: fatherPhone,
        fatherEmail: fatherEmail || null,
        motherName: motherName || null,
        motherPhone: motherPhone || null,
        motherEmail: motherEmail || null,
        communicationAddress: communicationAddress || null,
        guardianName: lgName || null,
        guardianRelationship: lgRel || null,
        guardianPhone: lgPhone || null,
        guardianAddress: lgAddress || null,
        healthIssues: healthIssues || null,
        allergies: allergies || null,
        currentMedications: medication || null,
        emergencyContact: emergencyContact,

        // Legacy compatibility
        usn: finalUsn,
        department: finalCourse,
        yearSem: sem,
        address: permanentAddress,
        hostelPref: gender === "Male" ? "Boys Hostel" : "Girls Hostel",
        medicalInfo: healthIssues,
        remarks: "",
        passportPhoto: uploadedPhotoUrl || null,
      });

      // Login student using exact name and phone number credentials
      login(finalUsn, fullName, contact);

      alert("Application submitted successfully! You are now logged in.");
      navigate("/");
    } catch (err) {
      console.error(err);
      setFormErrors("Failed to submit application.");
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      <HeroBanner 
        image="/facilities/block1.jpeg"
        title="Hostel Admission Form"
      />

      <div className="bg-white border border-border rounded-2xl shadow-soft p-6 md:p-8">
        
        {/* Progress Stepper */}
        <div className="flex items-center justify-between max-w-xl mx-auto mb-8 relative">
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-100 -translate-y-1/2 z-0" />
          <div className={`absolute top-1/2 left-0 h-0.5 bg-primary -translate-y-1/2 transition-all duration-300 z-0`} style={{ width: `${((step - 1) / 2) * 100}%` }} />
          
          {[1, 2, 3].map(num => (
            <button
              key={num}
              onClick={() => step > num && setStep(num)}
              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border relative z-10 transition-all ${
                step === num 
                  ? 'bg-primary text-white border-primary shadow-md' 
                  : step > num 
                    ? 'bg-success text-white border-success' 
                    : 'bg-white text-text-muted border-border hover:bg-slate-50'
              }`}
              disabled={step < num}
              type="button"
            >
              {num}
            </button>
          ))}
        </div>

        {formErrors && (
          <div className="bg-danger/10 border border-danger/20 text-danger p-3 rounded-xl text-xs flex gap-2 items-center max-w-xl mx-auto mb-6">
            <ShieldAlert className="w-4.5 h-4.5 shrink-0" />
            <span className="font-bold">{formErrors}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto">
          
          {/* STEP 1: Quota & Student Details */}
          {step === 1 && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h3 className="text-sm font-black text-text uppercase tracking-wider">Step 1: Quota & Student Details</h3>
                <p className="text-[11px] text-text-muted mt-0.5 leading-relaxed font-semibold">Enter your admission categories and personal academic info.</p>
              </div>

              {/* Admission Quota Section */}
              <div className="bg-slate-50 p-4 rounded-xl border border-border space-y-4">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Admission Quota *</span>
                <div className="flex flex-wrap gap-4">
                  {['CET', 'COMED-K K', 'COMED-K NK', 'MANAGEMENT', 'PIO'].map(q => (
                    <label key={q} className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                      <input 
                        type="radio" 
                        name="quota" 
                        value={q}
                        checked={quota === q}
                        onChange={e => {
                          setQuota(e.target.value);
                          if (e.target.value === 'MANAGEMENT') setRank('');
                        }}
                        className="text-primary focus:ring-primary/20"
                      />
                      <span>{q}</span>
                    </label>
                  ))}
                </div>

                {quota !== 'MANAGEMENT' && (
                  <div className="space-y-1 w-full max-w-xs mt-3 animate-fadeIn">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Entrance Exam Rank *</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 15420"
                      value={rank}
                      onChange={e => setRank(e.target.value.replace(/\D/g, ''))}
                      required
                      className="w-full border border-border rounded-lg p-2 text-xs font-bold font-mono outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                )}
              </div>

              {/* Personal Details fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Full Name *</label>
                  <input 
                    type="text" 
                    placeholder="Enter full name"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    required
                    className="w-full border border-border rounded-lg p-2 text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Gender *</label>
                  <select 
                    value={gender} 
                    onChange={e => setGender(e.target.value)}
                    className="w-full border border-border rounded-lg p-2 text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Date of Birth *</label>
                  <input 
                    type="date" 
                    value={dob}
                    onChange={e => setDob(e.target.value)}
                    required
                    className="w-full border border-border rounded-lg p-2 text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Blood Group</label>
                  <select 
                    value={bloodGroup} 
                    onChange={e => setBloodGroup(e.target.value)}
                    className="w-full border border-border rounded-lg p-2 text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Nationality *</label>
                  <select 
                    value={nationality}
                    onChange={e => {
                      setNationality(e.target.value);
                      setAadhaar('');
                    }}
                    className="w-full border border-border rounded-lg p-2 text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                  >
                    <option value="Indian">Indian</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Religion</label>
                  <select 
                    value={religion}
                    onChange={e => setReligion(e.target.value)}
                    className="w-full border border-border rounded-lg p-2 text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                  >
                    <option value="">Select Religion</option>
                    <option value="Hindu">Hindu</option>
                    <option value="Muslim">Muslim</option>
                    <option value="Christian">Christian</option>
                    <option value="Sikh">Sikh</option>
                    <option value="Buddhist">Buddhist</option>
                    <option value="Jain">Jain</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {nationality === 'Indian' ? (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Aadhaar Number *</label>
                    <input 
                      type="text" 
                      placeholder="12-digit Aadhaar"
                      maxLength={12}
                      value={aadhaar}
                      onChange={e => setAadhaar(e.target.value.replace(/\D/g, ''))}
                      required
                      className="w-full border border-border rounded-lg p-2 text-xs font-bold font-mono outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Passport Number *</label>
                    <input 
                      type="text" 
                      placeholder="Enter Passport Number"
                      value={aadhaar}
                      onChange={e => setAadhaar(e.target.value.toUpperCase())}
                      required
                      className="w-full border border-border rounded-lg p-2 text-xs font-bold font-mono outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">BMSIT ID (Optional)</label>
                  <input 
                    type="text" 
                    placeholder="Enter BMSIT ID"
                    value={bmsitId}
                    onChange={e => setBmsitId(e.target.value.toUpperCase())}
                    className="w-full border border-border rounded-lg p-2 text-xs font-bold font-mono outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Program *</label>
                  <select 
                    value={program} 
                    onChange={handleProgramChange}
                    required
                    className="w-full border border-border rounded-lg p-2 text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="">Select Program</option>
                    <option value="Undergraduate (UG)">Undergraduate (UG)</option>
                    <option value="Postgraduate (PG)">Postgraduate (PG)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Branch *</label>
                  <select 
                    value={branch} 
                    onChange={e => setBranch(e.target.value)}
                    disabled={!program}
                    required
                    className="w-full border border-border rounded-lg p-2 text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                  >
                    <option value="">Select Branch</option>
                    {program === 'Undergraduate (UG)' && ugBranches.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                    {program === 'Postgraduate (PG)' && pgBranches.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Year / Semester *</label>
                  <select 
                    value={sem} 
                    onChange={e => setSem(e.target.value)}
                    className="w-full border border-border rounded-lg p-2 text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {['1st Semester', '2nd Semester', '3rd Semester', '4th Semester', '5th Semester', '6th Semester', '7th Semester', '8th Semester'].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Contact Number *</label>
                  <input 
                    type="tel" 
                    placeholder="10-digit number"
                    maxLength={10}
                    value={contact}
                    onChange={e => setContact(e.target.value.replace(/\D/g, ''))}
                    required
                    className="w-full border border-border rounded-lg p-2 text-xs font-bold font-mono outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Email Address *</label>
                  <input 
                    type="email" 
                    placeholder="student@domain.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="w-full border border-border rounded-lg p-2 text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Permanent Address *</label>
                <textarea 
                  placeholder="Enter permanent address details..."
                  rows={2}
                  value={permanentAddress}
                  onChange={e => setPermanentAddress(e.target.value)}
                  required
                  className="w-full border border-border rounded-lg p-2 text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              {/* Photo Upload block */}
              <div className="border border-dashed border-border rounded-xl p-4 flex flex-col items-center justify-center bg-slate-50/50">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Upload Student Photo (Passport Size)</span>
                <input 
                  type="file" 
                  id="photo-upload" 
                  accept="image/*" 
                  onChange={e => {
                    const file = e.target.files?.[0] || null;
                    setPhotoFile(file);
                    setPhotoName(file ? file.name : '');
                  }}
                  className="hidden" 
                />
                <label 
                  htmlFor="photo-upload" 
                  className="mt-2 bg-white hover:bg-slate-100 border border-border text-slate-700 font-bold py-1.5 px-3 rounded-lg text-[10px] cursor-pointer shadow-sm transition-colors"
                >
                  Choose Image File
                </label>
                {photoName && (
                  <span className="text-[10px] text-success font-bold mt-1">✓ {photoName} selected</span>
                )}
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="bg-primary hover:bg-primary-dark text-white font-bold py-2.5 px-5 rounded-xl text-xs flex items-center gap-1.5 transition-colors"
                >
                  <span>Continue Step 2</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Parent & Guardian Details */}
          {step === 2 && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h3 className="text-sm font-black text-text uppercase tracking-wider">Step 2: Parent & Guardian Profiles</h3>
                <p className="text-[11px] text-text-muted mt-0.5 leading-relaxed font-semibold">Enter contacts for parents and local guardians.</p>
              </div>

              {/* Parents Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                
                {/* Father Info */}
                <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl space-y-3">
                  <span className="text-[10px] font-bold text-primary-light uppercase tracking-wider block border-b border-slate-200 pb-1">Father details *</span>
                  <div className="space-y-2">
                    <input 
                      type="text" 
                      placeholder="Father Full Name" 
                      value={fatherName} 
                      onChange={e => setFatherName(e.target.value)}
                      required
                      className="w-full border border-border rounded-lg p-2 text-xs font-bold outline-none bg-white focus:ring-2 focus:ring-primary/20"
                    />
                    <input 
                      type="text" 
                      placeholder="Occupation" 
                      value={fatherOcc} 
                      onChange={e => setFatherOcc(e.target.value)}
                      className="w-full border border-border rounded-lg p-2 text-xs font-bold outline-none bg-white focus:ring-2 focus:ring-primary/20"
                    />
                    <input 
                      type="tel" 
                      placeholder="Father Phone Number" 
                      maxLength={10}
                      value={fatherPhone} 
                      onChange={e => setFatherPhone(e.target.value.replace(/\D/g, ''))}
                      required
                      className="w-full border border-border rounded-lg p-2 text-xs font-bold font-mono outline-none bg-white focus:ring-2 focus:ring-primary/20"
                    />
                    <input 
                      type="email" 
                      placeholder="Father Email Address" 
                      value={fatherEmail} 
                      onChange={e => setFatherEmail(e.target.value)}
                      className="w-full border border-border rounded-lg p-2 text-xs font-bold outline-none bg-white focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>

                {/* Mother Info */}
                <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl space-y-3">
                  <span className="text-[10px] font-bold text-primary-light uppercase tracking-wider block border-b border-slate-200 pb-1">Mother details *</span>
                  <div className="space-y-2">
                    <input 
                      type="text" 
                      placeholder="Mother Full Name" 
                      value={motherName} 
                      onChange={e => setMotherName(e.target.value)}
                      required
                      className="w-full border border-border rounded-lg p-2 text-xs font-bold outline-none bg-white focus:ring-2 focus:ring-primary/20"
                    />
                    <input 
                      type="text" 
                      placeholder="Occupation" 
                      value={motherOcc} 
                      onChange={e => setMotherOcc(e.target.value)}
                      className="w-full border border-border rounded-lg p-2 text-xs font-bold outline-none bg-white focus:ring-2 focus:ring-primary/20"
                    />
                    <input 
                      type="tel" 
                      placeholder="Mother Phone Number" 
                      maxLength={10}
                      value={motherPhone} 
                      onChange={e => setMotherPhone(e.target.value.replace(/\D/g, ''))}
                      required
                      className="w-full border border-border rounded-lg p-2 text-xs font-bold font-mono outline-none bg-white focus:ring-2 focus:ring-primary/20"
                    />
                    <input 
                      type="email" 
                      placeholder="Mother Email Address" 
                      value={motherEmail} 
                      onChange={e => setMotherEmail(e.target.value)}
                      className="w-full border border-border rounded-lg p-2 text-xs font-bold outline-none bg-white focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>

              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Communication Address</label>
                <textarea 
                  placeholder="Enter communication address details..."
                  rows={2}
                  value={communicationAddress}
                  onChange={e => setCommunicationAddress(e.target.value)}
                  className="w-full border border-border rounded-lg p-2 text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Local Guardian Section */}
              <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl space-y-3">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block border-b border-slate-200 pb-1">Local Guardian details (If applicable)</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input 
                    type="text" 
                    placeholder="Guardian Name" 
                    value={lgName} 
                    onChange={e => setLgName(e.target.value)}
                    className="w-full border border-border rounded-lg p-2 text-xs font-bold outline-none bg-white focus:ring-2 focus:ring-primary/20"
                  />
                  <input 
                    type="text" 
                    placeholder="Relationship" 
                    value={lgRel} 
                    onChange={e => setLgRel(e.target.value)}
                    className="w-full border border-border rounded-lg p-2 text-xs font-bold outline-none bg-white focus:ring-2 focus:ring-primary/20"
                  />
                  <input 
                    type="tel" 
                    placeholder="Phone" 
                    maxLength={10}
                    value={lgPhone} 
                    onChange={e => setLgPhone(e.target.value.replace(/\D/g, ''))}
                    className="w-full border border-border rounded-lg p-2 text-xs font-bold font-mono outline-none bg-white focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <input 
                  type="text" 
                  placeholder="Local Guardian Address" 
                  value={lgAddress} 
                  onChange={e => setLgAddress(e.target.value)}
                  className="w-full border border-border rounded-lg p-2 text-xs font-bold outline-none bg-white focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="bg-slate-100 hover:bg-slate-200 border border-border text-slate-700 font-bold py-2.5 px-5 rounded-xl text-xs flex items-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="bg-primary hover:bg-primary-dark text-white font-bold py-2.5 px-5 rounded-xl text-xs flex items-center gap-1.5 transition-colors"
                >
                  <span>Continue Step 3</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Medical Info & Undertaking */}
          {step === 3 && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h3 className="text-sm font-black text-text uppercase tracking-wider">Step 3: Medical info & Undertaking</h3>
                <p className="text-[11px] text-text-muted mt-0.5 leading-relaxed font-semibold">Enter health guidelines and sign the admission declaration.</p>
              </div>

              {/* Medical Section */}
              <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl space-y-3">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block border-b border-slate-200 pb-1">Medical information</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input 
                    type="text" 
                    placeholder="Existing Health Issues (Optional)" 
                    value={healthIssues} 
                    onChange={e => setHealthIssues(e.target.value)}
                    className="w-full border border-border rounded-lg p-2 text-xs font-bold outline-none bg-white focus:ring-2 focus:ring-primary/20"
                  />
                  <input 
                    type="text" 
                    placeholder="Allergies (Optional)" 
                    value={allergies} 
                    onChange={e => setAllergies(e.target.value)}
                    className="w-full border border-border rounded-lg p-2 text-xs font-bold outline-none bg-white focus:ring-2 focus:ring-primary/20"
                  />
                  <input 
                    type="text" 
                    placeholder="Medications currently taking" 
                    value={medication} 
                    onChange={e => setMedication(e.target.value)}
                    className="w-full border border-border rounded-lg p-2 text-xs font-bold outline-none bg-white focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Emergency Contact Number *</label>
                  <input 
                    type="tel" 
                    placeholder="10-digit emergency number"
                    maxLength={10}
                    value={emergencyContact} 
                    onChange={e => setEmergencyContact(e.target.value.replace(/\D/g, ''))}
                    required
                    className="w-full border border-border rounded-lg p-2 text-xs font-bold font-mono outline-none bg-white focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              {/* Undertaking Declaration */}
              <div className="bg-slate-900 text-white p-5 rounded-xl border border-slate-800 space-y-4">
                <span className="text-[9px] font-black tracking-widest text-primary-light uppercase block">Student Undertaking Declaration</span>
                <p className="text-[10.5px] text-slate-300 leading-relaxed font-semibold">
                  I hereby declare that all the details provided in this admission application form are true and accurate to the best of my knowledge. I agree to abide by all standard rules and academic regulations of OM SAI PG Accommodation. I understand that misrepresentation of details can lead to immediate cancellation of allotted rooms.
                </p>
                
                <label className="flex items-start gap-2.5 text-xs text-white font-bold cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={undertakingCheck} 
                    onChange={e => setUndertakingCheck(e.target.checked)}
                    className="text-primary focus:ring-primary/20 rounded mt-0.5" 
                  />
                  <span>I agree to the declaration statement and abide by all PG rules. *</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1 text-slate-300">
                    <label className="text-[9px] font-bold uppercase tracking-wider block text-slate-400">Digital Signature (Type Full Name) *</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Dhanitha Machireddy" 
                      value={signature} 
                      onChange={e => setSignature(e.target.value)}
                      required
                      className="w-full border border-slate-700 bg-slate-800 rounded-lg p-2 text-xs font-bold outline-none focus:ring-2 focus:ring-primary-light/20 text-white"
                    />
                  </div>
                  <div className="space-y-1 text-slate-300">
                    <label className="text-[9px] font-bold uppercase tracking-wider block text-slate-400">Date *</label>
                    <input 
                      type="date" 
                      value={sigDate} 
                      onChange={e => setSigDate(e.target.value)}
                      required
                      className="w-full border border-slate-700 bg-slate-800 rounded-lg p-2 text-xs font-bold outline-none focus:ring-2 focus:ring-primary-light/20 text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="bg-slate-100 hover:bg-slate-200 border border-border text-slate-700 font-bold py-2.5 px-5 rounded-xl text-xs flex items-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>
                <button
                  type="submit"
                  className="bg-success hover:bg-emerald-600 text-white font-bold py-2.5 px-6 rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow"
                >
                  <Save className="w-4 h-4" />
                  <span>Submit Application</span>
                </button>
              </div>
            </div>
          )}

        </form>
      </div>
    </div>
  );
};