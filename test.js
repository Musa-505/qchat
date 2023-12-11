import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Keyboard,
  Modal,
  Image,
  FlatList,
  Button,
} from "react-native";
import {
  addDoc,
  collection,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  getDocs,
  deleteDoc,
  doc,
  where,
} from "firebase/firestore";
import { db } from "../config";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { useLayoutEffect } from "react";
import * as ImagePicker from "expo-image-picker";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Audio, Video } from "expo-av";

const ChatScreen = ({ route }) => {
  const { userId, chatName, currdata } = route.params;
  const chatid = userId + " " + currdata;
  const chatid2 = currdata + " " + userId;
  const { setOptions } = useNavigation();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isPlaying, setIsPlaying] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const flatListRef = useRef();
  const storage = getStorage();
  const [recording, setRecording] = useState(null);
  const [audioUri, setAudioUri] = useState(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingIntervalRef = useRef(null);

  const startRecording = async () => {
    try {
      console.log("Requesting permissions..");
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log("Starting recording..");
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setIsRecording(true);
      console.log("Recording started");

      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration((prevDuration) => prevDuration + 1);
      }, 1000);
    } catch (err) {
      console.error("Failed to start recording", err);
    }
  };

  const stopRecording = async () => {
    console.log("Stopping recording..");
    setIsRecording(false);
    clearInterval(recordingIntervalRef.current);

    setRecording(null);
    await recording.stopAndUnloadAsync();
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
    });
    const uri = recording.getURI();
    console.log("Recording stopped and stored at", uri);
    setAudioUri(uri);
    setRecordingDuration(0);
  };

  useEffect(() => {
    return () => {
      clearInterval(recordingIntervalRef.current);
    };
  }, []);

  const handleRecordingButtonPress = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  useLayoutEffect(() => {
    setOptions({
      headerTitle: chatName,
      headerRight: () => (
        <TouchableOpacity onPress={handleClearChat} style={styles.clearButton}>
          <Ionicons name="trash-outline" size={24} color="red" />
        </TouchableOpacity>
      ),
    });
  }, [chatName, setOptions]);

  useEffect(() => {
    const q = query(collection(db, "messages"), orderBy("timestamp"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messagesData = [];
      snapshot.forEach((doc) => {
        messagesData.push({ id: doc.id, ...doc.data() });
      });
      setMessages(messagesData);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Update the status of messages when the user views them
    const updateMessageStatus = async () => {
      const messagesToUpdate = messages.filter(
        (message) => message.userId === currdata && message.status === "sent"
      );

      for (const message of messagesToUpdate) {
        const messageRef = doc(db, "messages", message.id);
        await updateDoc(messageRef, { status: "read" });
      }
    };

    updateMessageStatus();
  }, [messages, userId]);

  const handleSend = async () => {
    const currentUserEmail = await AsyncStorage.getItem("currentUserEmail");
    const currentUserID = await AsyncStorage.getItem("currentUserID");
    if (
      (inputMessage.trim() !== "" || inputMessage.trim() !== "" && selectedImage) ||
      selectedImage ||
      audioUri
    ) {
      let imageUrl = null;
      let audioUrl = null;

      if (selectedImage) {
        const imageRef = ref(storage, `images/${Date.now()}`);
        const response = await fetch(selectedImage);
        const blob = await response.blob();
        await uploadBytes(imageRef, blob);

        imageUrl = await getDownloadURL(imageRef);
      }

      if (audioUri) {
        const audioRef = ref(storage, `audio/${Date.now()}`);
        const response = await fetch(audioUri);
        const blob = await response.blob();
        await uploadBytes(audioRef, blob);

        audioUrl = await getDownloadURL(audioRef);
      }

      const newMessage = {
        userId: userId,
        currentID: currentUserID,
        receiver: currentUserEmail,
        text: inputMessage,
        image: imageUrl,
        audio: audioUrl,
        timestamp: new Date().getTime(),
        status: "sent",
        chatid: chatid,
      };

      await addDoc(collection(db, "messages"), newMessage);

      setInputMessage("");
      setSelectedImage(null);
      setAudioUri(null);
      flatListRef.current.scrollToEnd({ animated: true });
    }
  };

  const handleKeyPress = ({ nativeEvent }) => {
    if (nativeEvent.key === "Enter" && !nativeEvent.shiftKey) {
      // Prevent line break in the message
      Keyboard.dismiss();
      handleSend();
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.cancelled) {
      setSelectedImage(result.uri);
    }
  };

  const handleClearChat = async () => {
    setShowModal(true);
  };

  const handleConfirmClear = async () => {
    try {
      // Clear the chat in Firestore
      const messagesRef = collection(db, "messages");
      const querySnapshot = await getDocs(
        query(messagesRef, where("chatid", "in", [chatid, chatid2]))
      );
      querySnapshot.forEach((doc) => {
        deleteDoc(doc.ref);
      });

      // Clear the chat in the state
      setMessages([]);
    } catch (error) {
      console.error("Error clearing chat:", error);
    }

    setShowModal(false);
  };

  const handleCancelClear = () => {
    setShowModal(false);
  };

  const handlePlayAudio = async (audioUrl) => {
    if (audioUri === audioUrl) {
      if (isPlaying) {
        await recording.pauseAsync();
        setIsPlaying(false);
      } else {
        await recording.playAsync();
        setIsPlaying(true);
      }
    } else {
      if (recording) {
        await recording.unloadAsync();
      }

      const newRecording = new Audio.Sound();
      try {
        await newRecording.loadAsync({ uri: audioUrl });
        setRecording(newRecording);
        setAudioUri(audioUrl);
        setIsPlaying(true);
        await newRecording.playAsync();
      } catch (error) {
        console.log("Error playing audio: ", error);
      }
    }
  };

  const [selectedImageModalVisible, setSelectedImageModalVisible] =
    useState(null);
  const [imageshow, setimageshow] = useState(null);

  const openSelectedImageModal = () => {
    setimageshow();
  };

  const closeSelectedImageModal = () => {
    setSelectedImageModalVisible(false);
  };

  const renderMessage = ({ item }) => {
    if (item.chatid === chatid || item.chatid === chatid2) {
      const isSender = item.userId === userId;
      const messageContainerStyle = isSender
        ? styles.senderMessageContainer
        : styles.receiverMessageContainer;
      const messageTextStyle = isSender
        ? styles.senderMessageText
        : styles.receiverMessageText;

      const messageTime = new Date(item.timestamp).toLocaleTimeString([], {
        hour: "numeric",
        minute: "numeric",
      });

      return (
        <View style={messageContainerStyle}>
          {item.image && (
            <TouchableOpacity onPress={openSelectedImageModal()}>
              <Image source={{ uri: item.image }} style={styles.messageImage} />
            </TouchableOpacity>
          )}
          {item.audio && (
            <View style={styles.audioContainer}>
              <TouchableOpacity onPress={() => handlePlayAudio(item.audio)}>
                <Ionicons
                  name={isPlaying && audioUri === item.audio ? "pause" : "play"}
                  size={24}
                  color="green"
                />
              </TouchableOpacity>
            </View>
          )}
          <Text style={messageTextStyle}>{item.text}</Text>
          <Text style={styles.messageTime}>
            {messageTime}
            {isSender && item.status === "read" && (
              <Ionicons name="checkmark-done" size={16} color="blue" />
            )}
          </Text>
        </View>
      );
    }

    return null;
  };

  return (
    <View style={styles.container}>
      <Modal
        visible={selectedImageModalVisible}
        transparent
        onRequestClose={closeSelectedImageModal}
      >
        <View style={styles.modalContainer}>
          <Image source={{ uri: imageshow }} style={styles.modalImage} />
        </View>
      </Modal>
      {messages.length > 0 ? (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.flatListContent}
          onContentSizeChange={() =>
            flatListRef.current.scrollToEnd({ animated: true })
          }
        />
      ) : (
        <Text style={styles.noMessageText}>No messages yet</Text>
      )}
      <View style={styles.inputContainer}>
        <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
          <Ionicons name="image" size={24} color="#fff" />
        </TouchableOpacity>
        {selectedImage && (
          <TouchableOpacity onPress={() => setShowModal(true)}>
            <Image
              source={{ uri: selectedImage }}
              style={styles.selectedImage}
            />
          </TouchableOpacity>
        )}
        <TextInput
          style={styles.input}
          placeholder="Type your message"
          onChangeText={setInputMessage}
          value={inputMessage}
          onKeyPress={handleKeyPress}
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
          <Ionicons name="send" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.sendButton,
            { backgroundColor: "#2e6cff" },
          ]}
          onPress={handleRecordingButtonPress}
        >
          <Text style={styles.sendButtonText}>
            {isRecording ? (
              recordingDuration
            ) : (
              <Ionicons name="ios-mic" size={24} color="#fff" />
            )}
          </Text>
        </TouchableOpacity>
      </View>
      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalText}>Clear the chat?</Text>
            <View style={styles.modalButtons}>
              <Image
                source={{ uri: selectedImage }}
                style={styles.selectedImage}
              />
              <TouchableOpacity
                style={styles.modalButton}
                onPress={handleConfirmClear}
              >
                <Text style={styles.buttonText}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={handleCancelClear}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  flatListContent: {
    flexGrow: 1,
    paddingBottom: 20,
    height: Platform.OS === "web" ? 80 : null,
  },
  noMessageText: {
    flex: 1,
    textAlign: "center",
    textAlignVertical: "center",
    fontSize: 16,
    color: "gray",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderTopWidth: 1,
    borderTopColor: "#ccc",
    backgroundColor: "#fff",
  },
  imageButton: {
    marginHorizontal: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    backgroundColor: "#2e6cff",
  },
  selectedImage: {
    height: 80,
    width: 80,
    borderRadius: 5,
    marginHorizontal: 5,
  },
  input: {
    flex: 1,
    height: 40,
    paddingHorizontal: 10,
    borderRadius: 5,
    backgroundColor: "#f2f2f2",
  },
  sendButton: {
    marginHorizontal: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
    backgroundColor: "#2e6cff",
  },
  senderMessageContainer: {
    alignSelf: "flex-end",
    maxWidth: "70%",
    marginVertical: 5,
    marginRight: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    backgroundColor: "#f2f2f2",
  },
  receiverMessageContainer: {
    alignSelf: "flex-start",
    maxWidth: "70%",
    marginVertical: 5,
    marginLeft: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    backgroundColor: "#2e6c",
  },
  senderMessageText: {
    color: "black",
  },
  receiverMessageText: {
    color: "black",
  },
  messageImage: {
    height: 420,
    width: 230,
    borderRadius: 5,
    alignSelf: "center",
    marginVertical: 5,
  },
  messageTime: {
    fontSize: 12,
    color: "#999",
    alignSelf: "flex-end",
  },
  clearButton: {
    paddingHorizontal: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 10,
    backgroundColor: "#fff",
  },
  modalText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: "center",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "center",
  },
  modalButton: {
    marginHorizontal: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    backgroundColor: "#2e6cff",
  },
  buttonText: {
    color: "#fff",
  },
  modalImage: {
    height: 980,
    width: 520,
  },
  sendButton: {
    marginHorizontal: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
    backgroundColor: "#2e6cff",
  },
  sendButtonText: {
    color: "#fff",
  },
});

export default ChatScreen;