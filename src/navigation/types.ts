export type AuthStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
};

// Stack inside Threads tab
export type ThreadsStackParamList = {
  ThreadsList: undefined;
  ThreadDetail: {
    threadId: string;
    threadName: string;
  };
};

// Stack inside Profile tab
export type ProfileStackParamList = {
  ProfileMain: undefined;
  ManageMembers: undefined;
};

export type MainTabParamList = {
  Threads: undefined;
  Meetings: undefined;
  MemberHub: undefined;
  LeaderHub: undefined;
  Profile: undefined;
};

// Drawer navigator wraps the main tabs
export type DrawerParamList = {
  MainTabs: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  GroupSelect: undefined;
  Main: undefined;
};
