FROM nginx:alpine

RUN rm -rf /usr/share/nginx/html/*

COPY html /usr/share/nginx/html
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
