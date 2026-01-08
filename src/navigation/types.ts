export type AuthStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
};

export type MainStackParamList = {
  MainTabs: undefined;
  ThreadDetail: {
    threadId: string;
    threadName: string;
  };
  ManageMembers: undefined;
};

export type MainTabParamList = {
  Threads: undefined;
  Meetings: undefined;
  Resources: undefined;
  LeaderHub: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  ParishSelect: undefined;
  Main: undefined;
};
